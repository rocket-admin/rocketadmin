import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindActionRuleByIdDS } from '../application/data-structures/delete-action-rule.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { IFindActionRuleById } from './action-rules-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildFoundActionRulesWithActionsAndEventsDTO } from '../utils/build-found-action-rules-with-actions-and-events-dto.util.js';

@Injectable()
export class FindActionRuleWithActionsAndEventsUseCase
  extends AbstractUseCase<FindActionRuleByIdDS, FoundActionRulesWithActionsAndEventsDTO>
  implements IFindActionRuleById
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
    return buildFoundActionRulesWithActionsAndEventsDTO(foundRuleWithActionsAndEvents);
  }
}
