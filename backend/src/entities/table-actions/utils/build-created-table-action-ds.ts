import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildCreatedTableActionDS(tableAction: TableActionEntity): CreatedTableActionDS {
  return {
    id: tableAction.id,
    title: tableAction.title,
    type: tableAction.type,
    url: tableAction.url,
    icon: tableAction.icon,
  };
}
