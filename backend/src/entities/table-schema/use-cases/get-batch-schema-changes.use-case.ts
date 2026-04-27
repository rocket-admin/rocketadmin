import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { GetBatchSchemaChangeDs } from '../application/data-structures/get-batch-schema-change.ds.js';
import { SchemaChangeBatchResponseDto } from '../application/data-transfer-objects/schema-change-batch-response.dto.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IGetBatchSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetBatchSchemaChangesUseCase
	extends AbstractUseCase<GetBatchSchemaChangeDs, SchemaChangeBatchResponseDto>
	implements IGetBatchSchemaChange
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetBatchSchemaChangeDs): Promise<SchemaChangeBatchResponseDto> {
		const items = await this._dbContext.tableSchemaChangeRepository.findByBatchId(inputData.batchId);
		if (items.length === 0) {
			throw new NotFoundException('Schema change batch not found.');
		}
		return {
			batchId: inputData.batchId,
			changes: items.map(mapSchemaChangeToResponseDto),
		};
	}
}
