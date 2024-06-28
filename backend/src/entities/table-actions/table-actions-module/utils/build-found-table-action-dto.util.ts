import { FoundTableActionDTO } from '../../table-action-rules-module/application/dto/found-table-triggers-with-actions.dto.js';
import { TableActionEntity } from '../table-action.entity.js';

export function buildFoundTableActionDTO(tableAction: TableActionEntity): FoundTableActionDTO {
  return {
    id: tableAction.id,
    type: tableAction.type,
    emails: tableAction.emails,
    method: tableAction.method,
    url: tableAction.url,
    slack_url: tableAction.slack_url,
    created_at: tableAction.created_at,
  };
}
