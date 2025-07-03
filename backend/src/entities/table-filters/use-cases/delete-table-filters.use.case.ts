import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { FindTableFiltersDs } from '../application/data-structures/find-table-filters.ds.js';
import { IDeleteTableFilters } from './table-filters-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteTableFiltersUseCase
  extends AbstractUseCase<FindTableFiltersDs, SuccessResponse>
  implements IDeleteTableFilters
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableFiltersDs): Promise<SuccessResponse> {
    const { table_name, connection_id } = inputData;
    const foundTableFilters = await this._dbContext.tableFiltersRepository.findTableFiltersForTableInConnection(
      table_name,
      connection_id,
    );

    if (!foundTableFilters.length) {
      throw new NotFoundException(Messages.TABLE_FILTERS_NOT_FOUND);
    }
    await this._dbContext.tableFiltersRepository.remove(foundTableFilters);
    return {
      success: true,
    };
  }
}
