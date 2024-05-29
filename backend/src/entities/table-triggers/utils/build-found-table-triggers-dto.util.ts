import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { TableTriggersEntity } from '../table-triggers.entity.js';

export function buildFoundTableTriggersDto(
  tableTriggers: Array<TableTriggersEntity>,
): Array<FoundTableTriggersWithActionsDTO> {
  return tableTriggers.map((tableTrigger) => {
    return {
      id: tableTrigger.id,
      table_name: tableTrigger.table_name,
      created_at: tableTrigger.created_at,
      trigger_events: tableTrigger.trigger_events,
      table_actions: tableTrigger.table_actions.map((tableAction) => {
        return {
          id: tableAction.id,
          title: tableAction.title,
          type: tableAction.type,
          url: tableAction.url,
          icon: tableAction.icon,
          require_confirmation: tableAction.require_confirmation,
        };
      }),
    };
  });
}
