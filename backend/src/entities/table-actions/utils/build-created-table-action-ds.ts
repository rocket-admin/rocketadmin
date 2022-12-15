import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { TableActionEntity } from '../table-action.entity';

export function buildCreatedTableActionDS(tableAction: TableActionEntity): CreatedTableActionDS {
  return {
    id: tableAction.id,
    title: tableAction.title,
    type: tableAction.type,
    url: tableAction.url,
    icon: tableAction.icon,
  };
}
