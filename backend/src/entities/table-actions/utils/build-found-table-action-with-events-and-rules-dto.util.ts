import { FoundTableActionWithEventsAndRulesDto } from '../application/dto/found-table-action-with-events-and-rules.dto.js';
import { TableActionEntity } from '../table-actions-module/table-action.entity.js';

export function buildFoundTableActionEventsAndRulesDto(
  tableAction: TableActionEntity,
): FoundTableActionWithEventsAndRulesDto {
  return {
    action_rules_data: tableAction.action_rules.map((rule) => ({
      id: rule.id,
      table_name: rule.table_name,
      title: rule.title,
      events_data: rule.action_events.map((event) => ({
        id: event.id,
        event: event.event,
        title: event.title,
        icon: event.icon,
        table_name: event.table_name,
        require_confirmation: event.require_confirmation,
        created_at: event.created_at,
      })),
    })),
    created_at: tableAction.created_at,
    emails: tableAction.emails,
    id: tableAction.id,
    method: tableAction.method,
    slack_url: tableAction.slack_url,
    type: tableAction.type,
    url: tableAction.url,
  };
}
