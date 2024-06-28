import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { ActionRulesEntity } from '../action-rules.entity.js';
import { CreateRuleDataDs } from '../application/data-structures/create-action-rules.ds.js';

export function buildEmptyActionRule(ruleData: CreateRuleDataDs, connection: ConnectionEntity): ActionRulesEntity {
  const newActionRule = new ActionRulesEntity();
  newActionRule.title = ruleData.rule_title;
  newActionRule.table_name = ruleData.table_name;
  newActionRule.action_events = [];
  newActionRule.table_actions = [];
  newActionRule.connection = connection;
  return newActionRule;
}
