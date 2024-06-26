import { CreateTableActionData } from '../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { TableActionEntity } from '../table-actions-module/table-action.entity.js';

export function buildTableActionEntityV2(actionData: CreateTableActionData): TableActionEntity {
  const { action_emails, action_method, action_slack_url, action_type, action_url } = actionData;
  const newTableActionEntity = new TableActionEntity();
  newTableActionEntity.emails = action_emails;
  newTableActionEntity.method = action_method;
  newTableActionEntity.slack_url = action_slack_url;
  newTableActionEntity.type = action_type;
  newTableActionEntity.url = action_url;
  newTableActionEntity.action_rules = [];
  return newTableActionEntity;
}
