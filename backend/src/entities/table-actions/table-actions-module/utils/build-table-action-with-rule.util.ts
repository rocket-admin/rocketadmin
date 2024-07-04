import { ActionRulesEntity } from '../../table-action-rules-module/action-rules.entity.js';
import { CreateTableActionData } from '../../table-action-rules-module/application/data-structures/create-action-rules.ds.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildTableActionWithRule(
  tableActionData: CreateTableActionData,
  actionRule: ActionRulesEntity,
): TableActionEntity {
  const { action_emails, action_method, action_url, action_slack_url, action_type } = tableActionData;
  const newTableAction = new TableActionEntity();
  newTableAction.action_rule = actionRule;
  newTableAction.emails = action_emails;
  newTableAction.method = action_method;
  newTableAction.url = action_url;
  newTableAction.slack_url = action_slack_url;
  newTableAction.type = action_type;
  return newTableAction;
}
