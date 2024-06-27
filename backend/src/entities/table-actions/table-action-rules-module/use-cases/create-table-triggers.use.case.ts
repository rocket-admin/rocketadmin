import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { ICreateActionRule } from './action-rules-use-cases.interface.js';
import { CreateActionRuleDS } from '../application/data-structures/create-action-rules.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateActionRuleUseCase
  extends AbstractUseCase<CreateActionRuleDS, FoundActionRulesWithActionsAndEventsDTO>
  implements ICreateActionRule
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateActionRuleDS): Promise<FoundActionRulesWithActionsAndEventsDTO> {
    return null;
  }
}
