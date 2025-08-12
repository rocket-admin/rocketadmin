import { BadRequestException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { UpdateTableFilterDs } from '../application/data-structures/update-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { buildCreatedTableFilterRO } from '../utils/build-created-table-filters-response-object.util.js';
import { buildNewTableFiltersEntity } from '../utils/build-new-table-filters-entity.util.js';
import { UpdateTableFilterValidationDs, validateFiltersData } from '../utils/validate-table-filters-data.util.js';
import { IUpdateTableFilterById } from './table-filters-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateTableFiltersUseCase
  extends AbstractUseCase<UpdateTableFilterDs, CreatedTableFilterRO>
  implements IUpdateTableFilterById
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(updateTableFilterData: UpdateTableFilterDs): Promise<CreatedTableFilterRO> {
    const { connection_id, masterPwd, filter_id } = updateTableFilterData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      masterPwd,
    );
    if (foundConnection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
    }

    const filtersToUpdate = await this._dbContext.tableFiltersRepository.findTableFiltersByIdAndConnectionId(
      filter_id,
      connection_id,
    );

    if (!filtersToUpdate) {
      throw new NotFoundException(Messages.TABLE_FILTERS_NOT_FOUND);
    }

    const updatedTableFilterData: UpdateTableFilterValidationDs = {
      ...updateTableFilterData,
      table_name: filtersToUpdate.table_name,
    };

    const errors = await validateFiltersData(updatedTableFilterData, foundConnection);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(',\n'));
    }

    const updatedFilterEntity = buildNewTableFiltersEntity(updatedTableFilterData);
    for (const key in updatedFilterEntity) {
      // eslint-disable-next-line security/detect-object-injection
      if (updatedFilterEntity[key] === undefined) {
        // eslint-disable-next-line security/detect-object-injection
        delete updatedFilterEntity[key];
      }
    }
    const updatedFilters = Object.assign(filtersToUpdate, updatedFilterEntity);
    await this._dbContext.tableFiltersRepository.save(updatedFilters);
    return buildCreatedTableFilterRO(updatedFilters);
  }
}
