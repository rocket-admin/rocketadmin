import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindActionRuleByIdDS } from '../application/data-structures/delete-action-rule.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { IDeleteActionRuleInTable } from './action-rules-use-cases.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';

@Injectable({ scope: Scope.REQUEST })
export class DeleteActionRuleWithActionsAndEventsUseCase
  extends AbstractUseCase<FindActionRuleByIdDS, FoundActionRulesWithActionsAndEventsDTO>
  implements IDeleteActionRuleInTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindActionRuleByIdDS): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    const { connectionId, ruleId } = inputData;
    const foundRuleWithActionsAndEvents = await this._dbContext.actionRulesRepository.findOneWithActionsAndEvents(
      ruleId,
      connectionId,
    );
    if (!foundRuleWithActionsAndEvents) {
      throw new NotFoundException(Messages.RULE_NOT_FOUND);
    }
    const foundRuleCopy = { ...foundRuleWithActionsAndEvents };
    const { table_actions, action_events } = foundRuleWithActionsAndEvents;
    await this._dbContext.tableActionRepository.remove(table_actions);
    await this._dbContext.actionEventsRepository.remove(action_events);
    await this._dbContext.actionRulesRepository.remove(foundRuleWithActionsAndEvents);
    return buildFoundActionRulesWithActionsAndEventsDTO(foundRuleCopy);
  }
}
