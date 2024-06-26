import { ActionRuleData } from '../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { ActionRulesEntity } from '../table-action-rules-module/action-rules.entity.js';

export function buildTableActionRule(createActionRuleData: ActionRuleData): ActionRulesEntity {
  const { table_name, title } = createActionRuleData;
  const newActionRuleEntity = new ActionRulesEntity();
  newActionRuleEntity.table_name = table_name;
  newActionRuleEntity.title = title;
  return newActionRuleEntity;
}
