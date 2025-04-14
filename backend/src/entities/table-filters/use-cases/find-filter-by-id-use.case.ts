import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FindTableFilterByIdDs } from '../application/data-structures/find-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { buildCreatedTableFilterRO } from '../utils/build-created-table-filters-response-object.util.js';
import { IFindTableFilterById } from './table-filters-use-cases.interface.js';

@Injectable()
export class FindTableFilterByIdUseCase
  extends AbstractUseCase<FindTableFilterByIdDs, CreatedTableFilterRO>
  implements IFindTableFilterById
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableFilterByIdDs): Promise<CreatedTableFilterRO> {
    const { filter_id, connection_id } = inputData;
    const foundTableFilters = await this._dbContext.tableFiltersRepository.findTableFiltersByIdAndConnectionId(
      filter_id,
      connection_id,
    );

    if (!foundTableFilters) {
      throw new NotFoundException(Messages.TABLE_FILTERS_NOT_FOUND);
    }

    return buildCreatedTableFilterRO(foundTableFilters);
  }
}
