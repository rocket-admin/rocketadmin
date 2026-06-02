import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	Scope,
} from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { AIProviderType } from '../../../ai-core/interfaces/ai-service.interface.js';
import { AICoreService } from '../../../ai-core/services/ai-core.service.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { runSchemaChangeFixAiLoop } from '../ai/run-schema-change-fix-ai-loop.js';
import { ProposeSchemaChangeArgs } from '../ai/schema-change-tools.js';
import { ApproveBatchSchemaChangeDs } from '../application/data-structures/approve-batch-schema-change.ds.js';
import { SchemaChangeBatchResponseDto } from '../application/data-transfer-objects/schema-change-batch-response.dto.js';
import { TableSchemaChangeEntity } from '../table-schema-change.entity.js';
import {
	isDynamoDbSchemaChangeType,
	isElasticsearchSchemaChangeType,
	isMongoSchemaChangeType,
	SchemaChangeStatusEnum,
	SchemaChangeTypeEnum,
} from '../table-schema-change-enums.js';
import { assertDialectSupported } from '../utils/assert-dialect-supported.js';
import { validateProposedDynamoDbOp } from '../utils/dynamodb-schema-op.js';
import { validateProposedElasticsearchOp } from '../utils/elasticsearch-schema-op.js';
import { executeSchemaChange } from '../utils/execute-schema-change.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { validateProposedMongoOp } from '../utils/mongo-schema-op.js';
import { validateProposedDdl } from '../utils/validate-proposed-ddl.js';
import { IApproveBatchSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ApproveBatchSchemaChangesUseCase
	extends AbstractUseCase<ApproveBatchSchemaChangeDs, SchemaChangeBatchResponseDto>
	implements IApproveBatchSchemaChange
{
	private readonly logger = new Logger(ApproveBatchSchemaChangesUseCase.name);
	private readonly provider: AIProviderType = AIProviderType.BEDROCK;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
	) {
		super();
	}

	protected async implementation(inputData: ApproveBatchSchemaChangeDs): Promise<SchemaChangeBatchResponseDto> {
		const { batchId, masterPassword, confirmedDestructive } = inputData;

		const items = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		if (items.length === 0) {
			throw new NotFoundException('Schema change batch not found.');
		}

		const pending = items.filter(
			(it) => it.status === SchemaChangeStatusEnum.PENDING || it.status === SchemaChangeStatusEnum.APPROVED,
		);
		if (pending.length === 0) {
			throw new ConflictException('No items in this batch can be approved (they must be PENDING or APPROVED).');
		}

		const destructiveItems = pending.filter((it) => !it.isReversible);
		if (destructiveItems.length > 0 && !confirmedDestructive) {
			throw new BadRequestException({
				message: `This batch contains ${destructiveItems.length} non-reversible change(s) (ids: ${destructiveItems.map((it) => it.id).join(', ')}). Re-submit with confirmedDestructive=true to proceed.`,
				type: 'destructive_confirmation_required',
			});
		}

		const connectionType = items[0].databaseType as ConnectionTypesEnum;
		assertDialectSupported(connectionType);

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			items[0].connectionId,
			masterPassword ?? '',
		);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const applied: TableSchemaChangeEntity[] = [];

		for (const item of pending) {
			const transitioned = await this._dbContext.tableSchemaChangeRepository.transitionStatusIfMatches(
				item.id,
				item.status,
				SchemaChangeStatusEnum.APPLYING,
			);
			if (!transitioned) {
				await this.rollbackApplied(applied, connection, connectionType);
				throw new ConflictException(`Schema change ${item.id} state changed concurrently; batch aborted.`);
			}

			const sqlToRun = item.userModifiedSql ?? item.forwardSql;
			try {
				await executeSchemaChange({
					connection,
					connectionType,
					changeType: item.changeType,
					targetTableName: item.targetTableName,
					sql: sqlToRun,
				});
				const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
					item.id,
					SchemaChangeStatusEnum.APPLIED,
					{ appliedAt: new Date(), executionError: null },
				);
				if (updated) {
					applied.push(updated);
				}
			} catch (err) {
				const error = err as Error;
				this.logger.error(
					`Batch ${batchId}: forward execution failed at order ${item.orderInBatch} (${item.id}): ${error.message}`,
				);

				const repaired = await this.tryAutoFixAndApply({
					change: item,
					connection,
					connectionType,
					failingSql: sqlToRun,
					failingRollbackSql: item.rollbackSql,
					executionError: error.message,
				});
				if (repaired) {
					applied.push(repaired);
					continue;
				}

				const compensation = await this.runCompensation(item, connection, connectionType);
				const composedError = compensation.rollbackError
					? `${error.message} | self auto-rollback failed: ${compensation.rollbackError}`
					: error.message;

				await this._dbContext.tableSchemaChangeRepository.updateStatus(item.id, SchemaChangeStatusEnum.FAILED, {
					executionError: composedError,
					autoRollbackAttempted: !!item.rollbackSql,
					autoRollbackSucceeded: compensation.autoRollbackSucceeded,
				});

				const cascadeOutcome = await this.rollbackApplied(applied, connection, connectionType);
				const cascadeSummary = cascadeOutcome.successIds.length
					? ` Rolled back ${cascadeOutcome.successIds.length} earlier item(s): ${cascadeOutcome.successIds.join(', ')}.`
					: '';
				const cascadeFailureSummary = cascadeOutcome.failures.length
					? ` Cascade rollback failures: ${cascadeOutcome.failures.map((f) => `${f.changeId}=${f.error}`).join('; ')}.`
					: '';

				throw new BadRequestException({
					message: `Batch ${batchId} failed at order ${item.orderInBatch} (changeId=${item.id}): ${error.message}.${cascadeSummary}${cascadeFailureSummary}`,
					type: cascadeOutcome.failures.length ? 'batch_partial_failure' : 'batch_failed_with_cascade_rollback',
				});
			}
		}

		const refreshed = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		return {
			batchId,
			changes: refreshed.map(mapSchemaChangeToResponseDto),
		};
	}

	private async runCompensation(
		item: TableSchemaChangeEntity,
		connection: Parameters<typeof executeSchemaChange>[0]['connection'],
		connectionType: ConnectionTypesEnum,
	): Promise<{ autoRollbackSucceeded: boolean; rollbackError: string | null }> {
		if (!item.rollbackSql) {
			return { autoRollbackSucceeded: false, rollbackError: null };
		}
		try {
			await executeSchemaChange({
				connection,
				connectionType,
				changeType: item.changeType,
				targetTableName: item.targetTableName,
				sql: item.rollbackSql,
				allowAnyOperation: true,
			});
			return { autoRollbackSucceeded: true, rollbackError: null };
		} catch (rbErr) {
			const message = (rbErr as Error).message;
			this.logger.error(`Auto-rollback failed for change ${item.id}: ${message}`);
			return { autoRollbackSucceeded: false, rollbackError: message };
		}
	}

	private async tryAutoFixAndApply(args: {
		change: TableSchemaChangeEntity;
		connection: ConnectionEntity;
		connectionType: ConnectionTypesEnum;
		failingSql: string;
		failingRollbackSql: string | null;
		executionError: string;
	}): Promise<TableSchemaChangeEntity | null> {
		const { change, connection, connectionType, failingSql, failingRollbackSql, executionError } = args;

		if (change.aiAutoFixApplied) {
			this.logger.warn(`Change ${change.id} already auto-fixed once; skipping further auto-fix attempts.`);
			return null;
		}

		let fixed: ProposeSchemaChangeArgs | null;
		try {
			const fixResult = await runSchemaChangeFixAiLoop({
				aiCoreService: this.aiCoreService,
				provider: this.provider,
				connection,
				connectionType,
				changeType: change.changeType,
				targetTableName: change.targetTableName,
				originalUserPrompt: change.userPrompt,
				failingSql,
				failingRollbackSql,
				executionError,
				logger: this.logger,
			});
			fixed = fixResult?.fixedProposal ?? null;
		} catch (fixErr) {
			this.logger.error(`AI auto-fix attempt failed for change ${change.id}: ${getErrorMessage(fixErr)}`);
			return null;
		}
		if (!fixed) {
			return null;
		}

		try {
			this.validateRepairedProposal(fixed, connectionType, change.changeType);
		} catch (valErr) {
			this.logger.warn(`AI auto-fix proposal for change ${change.id} failed validation: ${getErrorMessage(valErr)}`);
			return null;
		}

		try {
			await executeSchemaChange({
				connection,
				connectionType,
				changeType: change.changeType,
				targetTableName: change.targetTableName,
				sql: fixed.forwardSql,
			});
		} catch (retryErr) {
			this.logger.warn(
				`AI auto-fix retry execute failed for change ${change.id}: ${getErrorMessage(retryErr)}; falling through to compensation.`,
			);
			return null;
		}

		const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
			change.id,
			SchemaChangeStatusEnum.APPLIED,
			{
				appliedAt: new Date(),
				executionError: null,
				forwardSql: fixed.forwardSql,
				rollbackSql: fixed.rollbackSql ?? null,
				aiAutoFixApplied: true,
				aiAutoFixOriginalForwardSql: failingSql,
				aiAutoFixOriginalRollbackSql: failingRollbackSql,
				aiAutoFixOriginalError: executionError,
			},
		);
		this.logger.log(`AI auto-fix succeeded for change ${change.id}; original error: ${executionError}`);
		return updated;
	}

	private validateRepairedProposal(
		proposal: ProposeSchemaChangeArgs,
		connectionType: ConnectionTypesEnum,
		changeType: SchemaChangeTypeEnum,
	): void {
		if (isMongoSchemaChangeType(changeType)) {
			validateProposedMongoOp({
				opJson: proposal.forwardSql,
				changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedMongoOp({
					opJson: proposal.rollbackSql,
					changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
			return;
		}
		if (isDynamoDbSchemaChangeType(changeType)) {
			validateProposedDynamoDbOp({
				opJson: proposal.forwardSql,
				changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedDynamoDbOp({
					opJson: proposal.rollbackSql,
					changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
			return;
		}
		if (isElasticsearchSchemaChangeType(changeType)) {
			validateProposedElasticsearchOp({
				opJson: proposal.forwardSql,
				changeType,
				targetTableName: proposal.targetTableName,
			});
			if (proposal.rollbackSql) {
				validateProposedElasticsearchOp({
					opJson: proposal.rollbackSql,
					changeType,
					targetTableName: proposal.targetTableName,
					allowAnyOperation: true,
				});
			}
			return;
		}
		validateProposedDdl({
			sql: proposal.forwardSql,
			connectionType,
			changeType,
			targetTableName: proposal.targetTableName,
		});
		if (proposal.rollbackSql) {
			validateProposedDdl({
				sql: proposal.rollbackSql,
				connectionType,
				changeType: SchemaChangeTypeEnum.ROLLBACK,
				targetTableName: proposal.targetTableName,
			});
		}
	}

	private async rollbackApplied(
		applied: TableSchemaChangeEntity[],
		connection: Parameters<typeof executeSchemaChange>[0]['connection'],
		connectionType: ConnectionTypesEnum,
	): Promise<{ successIds: string[]; failures: Array<{ changeId: string; error: string }> }> {
		const successIds: string[] = [];
		const failures: Array<{ changeId: string; error: string }> = [];
		for (let i = applied.length - 1; i >= 0; i--) {
			const item = applied[i];
			if (!item.rollbackSql) {
				failures.push({ changeId: item.id, error: 'no rollback SQL recorded' });
				continue;
			}
			try {
				await executeSchemaChange({
					connection,
					connectionType,
					changeType: item.changeType,
					targetTableName: item.targetTableName,
					sql: item.rollbackSql,
					allowAnyOperation: true,
				});
				await this._dbContext.tableSchemaChangeRepository.updateStatus(item.id, SchemaChangeStatusEnum.ROLLED_BACK, {
					rolledBackAt: new Date(),
				});
				successIds.push(item.id);
			} catch (rbErr) {
				const message = (rbErr as Error).message;
				this.logger.error(`Cascade rollback failed for change ${item.id}: ${message}`);
				failures.push({ changeId: item.id, error: message });
			}
		}
		return { successIds, failures };
	}
}
