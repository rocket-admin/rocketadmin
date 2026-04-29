import { ConflictException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { RejectSchemaChangeDs } from '../application/data-structures/reject-schema-change.ds.js';
import { SchemaChangeResponseDto } from '../application/data-transfer-objects/schema-change-response.dto.js';
import { SchemaChangeStatusEnum } from '../table-schema-change-enums.js';
import { mapSchemaChangeToResponseDto } from '../utils/map-schema-change-to-response-dto.js';
import { IRejectSchemaChange } from './table-schema-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class RejectSchemaChangeUseCase
	extends AbstractUseCase<RejectSchemaChangeDs, SchemaChangeResponseDto>
	implements IRejectSchemaChange
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: RejectSchemaChangeDs): Promise<SchemaChangeResponseDto> {
		const { changeId } = inputData;

		const change = await this._dbContext.tableSchemaChangeRepository.findByIdWithRelations(changeId);
		if (!change) {
			throw new NotFoundException('Schema change not found.');
		}

		if (change.status !== SchemaChangeStatusEnum.PENDING) {
			throw new ConflictException(`Schema change is ${change.status}; only PENDING changes can be rejected.`);
		}

		const updated = await this._dbContext.tableSchemaChangeRepository.updateStatus(
			change.id,
			SchemaChangeStatusEnum.REJECTED,
		);
		return mapSchemaChangeToResponseDto(updated!);
	}
}
