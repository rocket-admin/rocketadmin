import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds.js';
import { CreateTableActionDTO } from '../dto/create-table-action.dto.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildNewTableActionEntity(actionData: CreateTableActionDTO | UpdateTableActionDS): TableActionEntity {
  const newTableAction = new TableActionEntity();
  newTableAction.title = actionData.title;
  newTableAction.type = actionData.type;
  newTableAction.url = actionData.url;
  newTableAction.icon = actionData.icon;
  return newTableAction;
}
