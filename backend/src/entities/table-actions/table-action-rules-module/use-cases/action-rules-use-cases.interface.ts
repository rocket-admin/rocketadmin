import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { ActivateEventActionsDS } from '../application/data-structures/activate-rule-actions.ds.js';
import { CreateActionRuleDS } from '../application/data-structures/create-action-rules.ds.js';
import { FindActionRuleByIdDS } from '../application/data-structures/delete-action-rule.ds.js';
import { FindActionRulesDS } from '../application/data-structures/find-all-table-triggers.ds.js';
import { UpdateActionRuleDS } from '../application/data-structures/update-action-rule.ds.js';
import { ActivatedTableActionsDTO } from '../application/dto/activated-table-actions.dto.js';
import {
  FoundActionEventDTO,
  FoundActionRulesWithActionsAndEventsDTO,
} from '../application/dto/found-action-rules-with-actions-and-events.dto.js';
import { FoundTableActionRulesRoDTO } from '../application/dto/found-table-action-rules.ro.dto.js';

export interface ICreateActionRule {
  execute(
    inputData: CreateActionRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}

export interface IFindActionRulesForTable {
  execute(inputData: FindActionRulesDS): Promise<FoundTableActionRulesRoDTO>;
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

export interface IActivateTableActionsInRule {
  execute(inputData: ActivateEventActionsDS): Promise<ActivatedTableActionsDTO>;
}
