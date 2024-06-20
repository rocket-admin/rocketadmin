import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildCreatedTableActionDS(tableAction: TableActionEntity): CreatedTableActionDS {
  return {
    id: tableAction.id,
    type: tableAction.type,
    url: tableAction.url,
    method: tableAction.method,
    slack_url: tableAction.slack_url,
    emails: tableAction.emails,
  };
}
