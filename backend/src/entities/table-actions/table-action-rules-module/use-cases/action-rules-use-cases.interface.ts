import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateActionRuleDS } from '../application/data-structures/create-action-rules.ds.js';
import { FindActionRuleByIdDS } from '../application/data-structures/delete-action-rule.ds.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { UpdateActionRuleDS } from '../application/data-structures/update-action-rule.ds.js';
import {
  FoundActionEventDTO,
  FoundActionRulesWithActionsAndEventsDTO,
} from '../application/dto/found-action-rules-with-actions-and-events.dto.js';

export interface ICreateActionRule {
  execute(
    inputData: CreateActionRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IFindActionRulesForTable {
  execute(inputData: FindActionRulesDS): Promise<Array<FoundActionRulesWithActionsAndEventsDTO>>;
}

export interface IFindCustomEvents {
  execute(inputData: FindActionRulesDS): Promise<Array<FoundActionEventDTO>>;
}

export interface IFindActionRuleById {
  execute(inputData: FindActionRuleByIdDS): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IDeleteActionRuleInTable {
  execute(
    inputData: FindActionRuleByIdDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IUpdateActionRule {
  execute(
    inputData: UpdateActionRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}
