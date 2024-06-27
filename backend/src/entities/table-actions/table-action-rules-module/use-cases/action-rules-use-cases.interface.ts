import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreateActionRuleDS } from '../application/data-structures/create-action-rules.ds.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';

export interface ICreateActionRule {
  execute(
    inputData: CreateActionRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundActionRulesWithActionsAndEventsDTO>;
}
