import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { IFindActionRulesForTable } from './action-rules-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';
import { FoundTableActionRulesRoDTO } from '../application/dto/found-table-action-rules.ro.dto.js';

@Injectable()
export class FindActionRulesForTableUseCase
  extends AbstractUseCase<FindActionRulesDS, FoundTableActionRulesRoDTO>
  implements IFindActionRulesForTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindActionRulesDS): Promise<FoundTableActionRulesRoDTO> {
    const { connectionId, tableName } = inputData;
    const foundActionRules = await this._dbContext.actionRulesRepository.findAllFullActionRulesForTableInConnection(
      connectionId,
      tableName,
    );
    const foundTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);
    const display_name = foundTableSettings?.display_name ?? tableName;
    return {
      display_name: display_name,
      action_rules: foundActionRules.map((actionRule) => buildFoundActionRulesWithActionsAndEventsDTO(actionRule)),
    };
  }
}
