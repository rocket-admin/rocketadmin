import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { GetSchemaChangeDs } from '../application/data-structures/get-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IGetSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class GetSchemaChangeUseCase
	extends AbstractUseCase<GetSchemaChangeDs, SchemaChangeResponseDto>
	implements IGetSchemaChange
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: GetSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { changeId } = inputData;
		const change = await this._dbContext.tableSchemaChangeRepository.findByIdWithRelations(changeId);
		if (!change) {
			throw new NotFoundException('Schema change not found.');
		}
		return mapSchemaChangeToResponseDto(change);
	}
}
