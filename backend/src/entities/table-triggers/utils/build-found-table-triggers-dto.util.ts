import { FoundTableTriggersWithActionsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';
import { ActionRulesEntity } from '../action-rules.entity.js';

export function buildFoundTableTriggersDto(
  tableTriggers: Array<ActionRulesEntity>,
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
          type: tableAction.type,
          url: tableAction.url,
          require_confirmation: tableAction.require_confirmation,
        };
      }),
    };
  });
}

export function buildFoundTableTriggerDto(tableTriggers: ActionRulesEntity): FoundTableTriggersWithActionsDTO {
  return {
    id: tableTriggers.id,
    table_name: tableTriggers.table_name,
    created_at: tableTriggers.created_at,
    trigger_events: tableTriggers.trigger_events,
    table_actions: tableTriggers.table_actions.map((tableAction) => {
      return {
        id: tableAction.id,
        type: tableAction.type,
        url: tableAction.url,
        require_confirmation: tableAction.require_confirmation,
      };
    }),
  };
}
