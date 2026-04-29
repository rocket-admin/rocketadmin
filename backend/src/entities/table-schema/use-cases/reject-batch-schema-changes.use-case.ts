import { ConflictException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { RejectBatchSchemaChangeDs } from '../application/data-structures/reject-batch-schema-change.ds.js';
import { SchemaChangeBatchResponseDto } from '../application/data-transfer-objects/schema-change-batch-response.dto.js';
import { SchemaChangeStatusEnum } from '../table-schema-change-enums.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IRejectBatchSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class RejectBatchSchemaChangesUseCase
	extends AbstractUseCase<RejectBatchSchemaChangeDs, SchemaChangeBatchResponseDto>
	implements IRejectBatchSchemaChange
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: RejectBatchSchemaChangeDs): Promise<SchemaChangeBatchResponseDto> {
		const { batchId } = inputData;

		const items = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		if (items.length === 0) {
			throw new NotFoundException('Schema change batch not found.');
		}

		const rejectable = items.filter(
			(it) => it.status === SchemaChangeStatusEnum.PENDING || it.status === SchemaChangeStatusEnum.APPROVED,
		);
		if (rejectable.length === 0) {
			throw new ConflictException('No PENDING or APPROVED items in this batch can be rejected.');
		}

		for (const item of rejectable) {
			await this._dbContext.tableSchemaChangeRepository.updateStatus(item.id, SchemaChangeStatusEnum.REJECTED);
		}

		const refreshed = await this._dbContext.tableSchemaChangeRepository.findByBatchId(batchId);
		return {
			batchId,
			changes: refreshed.map(mapSchemaChangeToResponseDto),
		};
	}
}
