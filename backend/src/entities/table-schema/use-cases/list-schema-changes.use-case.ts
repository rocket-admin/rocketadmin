import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ListSchemaChangesDs } from '../application/data-structures/list-schema-changes.ds.js';
import { SchemaChangeListResponseDto } from '../application/data-transfer-objects/schema-change-list-response.dto.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IListSchemaChanges } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ListSchemaChangesUseCase
	extends AbstractUseCase<ListSchemaChangesDs, SchemaChangeListResponseDto>
	implements IListSchemaChanges
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: ListSchemaChangesDs): Promise<SchemaChangeListResponseDto> {
		const { connectionId, limit, offset } = inputData;

		const [items, total] = await this._dbContext.tableSchemaChangeRepository.findByConnectionPaginated(connectionId, {
			limit,
			offset,
		});

		const perPage = limit > 0 ? limit : 1;
		const currentPage = Math.floor(offset / perPage) + 1;
		const lastPage = Math.max(1, Math.ceil(total / perPage));

		return {
			data: items.map(mapSchemaChangeToResponseDto),
			pagination: { currentPage, lastPage, perPage, total },
		};
	}
}
