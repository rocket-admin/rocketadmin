import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableActionWithEventAndRuleDS } from '../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { FoundTableActionWithEventsAndRulesDto } from '../application/dto/found-table-action-with-events-and-rules.dto.js';

export interface ICreateTableActionV2 {
  execute(
    createActionData: CreateTableActionWithEventAndRuleDS,
    inTransaction: InTransactionEnum,
  ): Promise<FoundTableActionWithEventsAndRulesDto>;
}
