import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';

import { FindTableFiltersDs } from '../application/data-structures/find-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { IFindTableFilters } from './table-filters-use-cases.interface.js';
import { buildCreatedTableFilterRO } from '../utils/build-created-table-filters-response-object.util.js';

@Injectable()
export class FindTableFiltersUseCase
  extends AbstractUseCase<FindTableFiltersDs, Array<CreatedTableFilterRO>>
  implements IFindTableFilters
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableFiltersDs): Promise<Array<CreatedTableFilterRO>> {
    const { table_name, connection_id } = inputData;
    const foundTableFilters = await this._dbContext.tableFiltersRepository.findTableFiltersForTableInConnection(
      table_name,
      connection_id,
    );

    return foundTableFilters.map((tableFilters) => buildCreatedTableFilterRO(tableFilters));
  }
}
