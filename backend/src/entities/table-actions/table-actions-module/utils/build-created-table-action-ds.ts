import { FoundTableActionDTO } from '../../table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildFoundTableActionDS(tableAction: TableActionEntity): FoundTableActionDTO {
  return {
    id: tableAction.id,
    emails: tableAction.emails,
    method: tableAction.method,
    url: tableAction.url,
    slack_url: tableAction.slack_url,
    created_at: tableAction.created_at,
  };
}
