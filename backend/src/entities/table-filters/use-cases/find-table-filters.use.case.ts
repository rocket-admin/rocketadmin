import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { FindTableFiltersDs } from '../application/data-structures/find-table-filters.ds.js';
import { CreatedTableFiltersRO } from '../application/response-objects/created-table-filters.ro.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { IFindTableFilters } from './table-filters-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

@Injectable()
export class FindTableFiltersUseCase
  extends AbstractUseCase<FindTableFiltersDs, CreatedTableFiltersRO>
  implements IFindTableFilters
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableFiltersDs): Promise<CreatedTableFiltersRO> {
    const { table_name, connection_id } = inputData;
    const foundTableFilters = await this._dbContext.tableFiltersRepository.findTableFiltersForTableInConnection(
      table_name,
      connection_id,
    );
    if (!foundTableFilters) {
      throw new NotFoundException(Messages.TABLE_FILTERS_NOT_FOUND);
    }
    return {
      id: foundTableFilters.id,
      tableName: table_name,
      connectionId: foundTableFilters.connectionId,
      filters: foundTableFilters.filters,
    };
  }
}
