import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { FindTableFilterByIdDs } from '../application/data-structures/find-table-filters.ds.js';
import { IDeleteTableFilterById } from './table-filters-use-cases.interface.js';

@Injectable()
export class DeleteTableFilterByIdUseCase
  extends AbstractUseCase<FindTableFilterByIdDs, SuccessResponse>
  implements IDeleteTableFilterById
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableFilterByIdDs): Promise<SuccessResponse> {
    const { filter_id, connection_id } = inputData;
    const foundTableFilters = await this._dbContext.tableFiltersRepository.findTableFiltersByIdAndConnectionId(
      filter_id,
      connection_id,
    );

    if (!foundTableFilters) {
      throw new NotFoundException(Messages.TABLE_FILTERS_NOT_FOUND);
    }

    await this._dbContext.tableFiltersRepository.remove(foundTableFilters);
    return {
      success: true,
    };
  }
}
