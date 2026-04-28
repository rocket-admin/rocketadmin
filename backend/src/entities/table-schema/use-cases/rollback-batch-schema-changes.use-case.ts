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
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { RollbackBatchSchemaChangeDs } from '../application/data-structures/rollback-batch-schema-change.ds.js';
import { SchemaChangeBatchResponseDto } from '../application/data-transfer-objects/schema-change-batch-response.dto.js';
import { SchemaChangeStatusEnum, SchemaChangeTypeEnum } from '../table-schema-change-enums.js';
import { assertDialectSupported } from '../utils/assert-dialect-supported.js';
import { executeSchemaChange } from '../utils/execute-schema-change.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IRollbackBatchSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class RollbackBatchSchemaChangesUseCase
	extends AbstractUseCase<RollbackBatchSchemaChangeDs, SchemaChangeBatchResponseDto>
	implements IRollbackBatchSchemaChange
{
	private readonly logger = new Logger(RollbackBatchSchemaChangesUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: RollbackBatchSchemaChangeDs): Promise<SchemaChangeBatchResponseDto> {
		const { batchId, userId, masterPassword } = inputData;

		const items = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		if (items.length === 0) {
			throw new NotFoundException('Schema change batch not found.');
		}

		const applied = items.filter((it) => it.status === SchemaChangeStatusEnum.APPLIED);
		if (applied.length === 0) {
			throw new ConflictException('No APPLIED items in this batch can be rolled back.');
		}

		const missingRollback = applied.filter((it) => !it.rollbackSql);
		if (missingRollback.length > 0) {
			throw new BadRequestException({
				message: `One or more applied changes in this batch have no rollback SQL and cannot be reverted (ids: ${missingRollback.map((it) => it.id).join(', ')}).`,
				type: 'batch_rollback_unavailable',
			});
		}

		const connectionType = items[0].databaseType as ConnectionTypesEnum;
		assertDialectSupported(connectionType);

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			items[0].connectionId,
			masterPassword,
		);
		if (!connection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const failures: Array<{ changeId: string; error: string }> = [];

		for (let i = applied.length - 1; i >= 0; i--) {
			const item = applied[i];
			try {
				await executeSchemaChange({
					connection,
					connectionType,
					changeType: item.changeType,
					targetTableName: item.targetTableName,
					sql: item.rollbackSql!,
					allowAnyOperation: true,
				});
				await this._dbContext.tableSchemaChangeRepository.updateStatus(item.id, SchemaChangeStatusEnum.ROLLED_BACK, {
					rolledBackAt: new Date(),
				});
				await this._dbContext.tableSchemaChangeRepository.createPendingChange({
					connectionId: item.connectionId,
					authorId: userId,
					previousChangeId: item.id,
					forwardSql: item.rollbackSql!,
					rollbackSql: item.forwardSql,
					userModifiedSql: null,
					status: SchemaChangeStatusEnum.APPLIED,
					changeType: SchemaChangeTypeEnum.ROLLBACK,
					targetTableName: item.targetTableName,
					databaseType: item.databaseType,
					isReversible: true,
					userPrompt: `Manual rollback of batch ${batchId} (change ${item.id})`,
					aiSummary: `Rollback of "${item.aiSummary ?? item.id}"`,
					aiReasoning: null,
					aiModelUsed: null,
					appliedAt: new Date(),
				});
			} catch (err) {
				const message = (err as Error).message;
				this.logger.error(`Batch ${batchId}: rollback failed for change ${item.id}: ${message}`);
				failures.push({ changeId: item.id, error: message });
			}
		}

		if (failures.length > 0) {
			const detail = failures.map((f) => `${f.changeId}=${f.error}`).join('; ');
			throw new BadRequestException({
				message: `Batch rollback partially failed: ${failures.length} of ${applied.length} items could not be rolled back. ${detail}`,
				type: 'batch_rollback_partial_failure',
			});
		}

		const refreshed = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		return {
			batchId,
			changes: refreshed.map(mapSchemaChangeToResponseDto),
		};
	}
}
