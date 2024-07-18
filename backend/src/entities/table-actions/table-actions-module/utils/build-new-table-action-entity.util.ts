import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds.js';
import { CreateTableActionDTO } from '../dto/create-table-action.dto.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildNewTableActionEntity(actionData: CreateTableActionDTO | UpdateTableActionDS): TableActionEntity {
  const newTableAction = new TableActionEntity();
  newTableAction.url = actionData.url;
  newTableAction.slack_url = actionData.slack_url;
  newTableAction.method = actionData.method;
  newTableAction.emails = actionData.emails;
  return newTableAction;
}
