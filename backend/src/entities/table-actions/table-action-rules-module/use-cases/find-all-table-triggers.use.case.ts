import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindTableTriggersDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { IFindAllTableTriggers } from './table-triggers-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { buildFoundTableTriggersDto } from '../utils/build-found-table-triggers-dto.util.js';

@Injectable()
export class FindAllTableTriggersUseCase
  extends AbstractUseCase<FindTableTriggersDS, Array<FoundTableTriggersWithActionsDTO>>
  implements IFindAllTableTriggers
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindTableTriggersDS): Promise<FoundTableTriggersWithActionsDTO[]> {
    const { connectionId, tableName } = inputData;
    const foundTableTriggers = await this._dbContext.tableTriggersRepository.findActionRulesForTableWithTableActions(
      connectionId,
      tableName,
    );
    return buildFoundTableTriggersDto(foundTableTriggers);
  }
}
