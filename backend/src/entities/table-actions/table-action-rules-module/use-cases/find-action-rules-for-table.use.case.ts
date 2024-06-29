import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { IFindActionRulesForTable } from './action-rules-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';

@Injectable()
export class FindActionRulesFotTableUseCase
  extends AbstractUseCase<FindActionRulesDS, Array<FoundActionRulesWithActionsAndEventsDTO>>
  implements IFindActionRulesForTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindActionRulesDS): Promise<Array<FoundActionRulesWithActionsAndEventsDTO>> {
    const { connectionId, tableName } = inputData;
    const foundActionRules = await this._dbContext.actionRulesRepository.findAllFullActionRulesForTableInConnection(
      connectionId,
      tableName,
    );
    return foundActionRules.map((actionRule) => buildFoundActionRulesWithActionsAndEventsDTO(actionRule));
  }
}
