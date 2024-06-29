import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateActionRuleDS } from '../application/data-structures/create-action-rules.ds.js';
import { FindActionRuleByIdDS } from '../application/data-structures/delete-action-rule.ds.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';

export interface ICreateActionRule {
  execute(
    inputData: CreateActionRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IFindActionRulesForTable {
  execute(inputData: FindActionRulesDS): Promise<Array<FoundActionRulesWithActionsAndEventsDTO>>;
}

export interface IFindActionRuleById {
  execute(
    inputData: FindActionRuleByIdDS,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IDeleteActionRuleInTable {
  execute(
    inputData: FindActionRuleByIdDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}
