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
      table_actions: tableTrigger.table_actions.map((tableAction) => {
        return {
          id: tableAction.id,
          type: tableAction.type,
          url: tableAction.url,
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
    table_actions: tableTriggers.table_actions.map((tableAction) => {
      return {
        id: tableAction.id,
        type: tableAction.type,
        url: tableAction.url,
      };
    }),
  };
}
