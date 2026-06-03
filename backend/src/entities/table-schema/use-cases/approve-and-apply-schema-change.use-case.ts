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
import { ApproveSchemaChangeDs } from '../application/data-structures/approve-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
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
import { IApproveSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ApproveAndApplySchemaChangeUseCase
	extends AbstractUseCase<ApproveSchemaChangeDs, SchemaChangeResponseDto>
	implements IApproveSchemaChange
{
	private readonly logger = new Logger(ApproveAndApplySchemaChangeUseCase.name);
	private readonly provider: AIProviderType = AIProviderType.BEDROCK;

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly aiCoreService: AICoreService,
	) {
		super();
	}

	protected async implementation(inputData: ApproveSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { changeId, masterPassword, userModifiedSql, confirmedDestructive } = inputData;

		const change = await this._dbContext.tableSchemaChangeRepository.findByIdWithRelations(changeId);
		if (!change) {
			throw new NotFoundException('Schema change not found.');
		}

		if (change.status !== SchemaChangeStatusEnum.PENDING && change.status !== SchemaChangeStatusEnum.APPROVED) {
			throw new ConflictException(`Schema change is ${change.status}; only PENDING or APPROVED can be applied.`);
		}

		if (!change.isReversible && !confirmedDestructive) {
			throw new BadRequestException({
				message: 'This change is not reversible. Re-submit with confirmedDestructive=true to proceed.',
				type: 'destructive_confirmation_required',
			});
		}

		const connectionType = change.databaseType as ConnectionTypesEnum;
		assertDialectSupported(connectionType);

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			change.connectionId,
			masterPassword ?? '',
		);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const isMongo = isMongoSchemaChangeType(change.changeType);
		const isDynamoDb = isDynamoDbSchemaChangeType(change.changeType);
		const isElasticsearch = isElasticsearchSchemaChangeType(change.changeType);

		let sqlToRun = change.forwardSql;
		if (userModifiedSql && userModifiedSql.trim().length > 0) {
			if (isMongo) {
				validateProposedMongoOp({
					opJson: userModifiedSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			} else if (isDynamoDb) {
				validateProposedDynamoDbOp({
					opJson: userModifiedSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			} else if (isElasticsearch) {
				validateProposedElasticsearchOp({
					opJson: userModifiedSql,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			} else {
				validateProposedDdl({
					sql: userModifiedSql,
					connectionType,
					changeType: change.changeType,
					targetTableName: change.targetTableName,
				});
			}
			sqlToRun = userModifiedSql;
			await this._dbContext.tableSchemaChangeRepository.updateStatus(change.id, change.status, {
				userModifiedSql,
			});
		}

		const transitioned = await this._dbContext.tableSchemaChangeRepository.transitionStatusIfMatches(
			change.id,
			change.status,
			SchemaChangeStatusEnum.APPLYING,
		);
		if (!transitioned) {
			throw new ConflictException('Schema change state changed concurrently; refresh and retry.');
		}

		try {
			await executeSchemaChange({
				connection,
				connectionType,
				changeType: change.changeType,
				targetTableName: change.targetTableName,
				sql: sqlToRun,
			});
			const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
				change.id,
				SchemaChangeStatusEnum.APPLIED,
				{ appliedAt: new Date(), executionError: null },
			);
			return mapSchemaChangeToResponseDto(updated!);
		} catch (err) {
			const error = err as Error;
			this.logger.error(`Forward execution failed for change ${change.id}: ${error.message}`);

			const repaired = await this.tryAutoFixAndApply({
				change,
				connection,
				connectionType,
				failingSql: sqlToRun,
				failingRollbackSql: change.rollbackSql,
				executionError: error.message,
			});
			if (repaired) {
				return mapSchemaChangeToResponseDto(repaired);
			}

			let autoRollbackSucceeded = false;
			let rollbackError: string | null = null;
			if (change.rollbackSql) {
				try {
					await executeSchemaChange({
						connection,
						connectionType,
						changeType: change.changeType,
						targetTableName: change.targetTableName,
						sql: change.rollbackSql,
						allowAnyOperation: true,
					});
					autoRollbackSucceeded = true;
				} catch (rbErr) {
					rollbackError = (rbErr as Error).message;
					this.logger.error(`Auto-rollback failed for change ${change.id}: ${rollbackError}`);
				}
			}

			const composedError = rollbackError ? `${error.message} | auto-rollback failed: ${rollbackError}` : error.message;

			await this._dbContext.tableSchemaChangeRepository.updateStatus(change.id, SchemaChangeStatusEnum.FAILED, {
				executionError: composedError,
				autoRollbackAttempted: !!change.rollbackSql,
				autoRollbackSucceeded,
			});

			throw new BadRequestException({
				message: `Schema change failed: ${error.message}`,
				autoRollbackAttempted: !!change.rollbackSql,
				autoRollbackSucceeded,
			});
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
				`AI auto-fix retry execute failed for change ${change.id}: ${getErrorMessage(retryErr)}; falling through to rollback.`,
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
}
