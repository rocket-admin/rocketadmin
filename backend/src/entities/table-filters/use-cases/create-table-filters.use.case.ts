import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreateTableFilterDs } from '../application/data-structures/create-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { buildCreatedTableFilterRO } from '../utils/build-created-table-filters-response-object.util.js';
import { buildNewTableFiltersEntity } from '../utils/build-new-table-filters-entity.util.js';
import { validateFiltersData } from '../utils/validate-table-filters-data.util.js';
import { ICreateTableFilters } from './table-filters-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateTableFiltersUseCase
  extends AbstractUseCase<CreateTableFilterDs, CreatedTableFilterRO>
  implements ICreateTableFilters
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableFilterDs): Promise<CreatedTableFilterRO> {
    const { connection_id, masterPwd } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      masterPwd,
    );
    if (foundConnection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
    }

    const errors = await validateFiltersData(inputData, foundConnection);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(',\n'));
    }

    const newTableFilters = buildNewTableFiltersEntity(inputData);

    const savedTableFilters = await this._dbContext.tableFiltersRepository.save(newTableFilters);
    return buildCreatedTableFilterRO(savedTableFilters);
  }
}
