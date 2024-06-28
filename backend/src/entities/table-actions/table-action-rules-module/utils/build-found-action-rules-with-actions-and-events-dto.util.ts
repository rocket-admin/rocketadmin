import { buildFoundActionEventDTO } from '../../table-action-events-module/utils/build-found-action-avent-dto.util.js';
import { buildFoundTableActionDTO } from '../../table-actions-module/utils/build-found-table-action-dto.util.js';
import { ActionRulesEntity } from '../action-rules.entity.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../application/dto/found-table-triggers-with-actions.dto.js';

export function buildFoundActionRulesWithActionsAndEventsDTO(
  actionRule: ActionRulesEntity,
): FoundActionRulesWithActionsAndEventsDTO {
  return {
    id: actionRule.id,
    table_name: actionRule.table_name,
    created_at: actionRule.created_at,
    title: actionRule.title,
    table_actions: actionRule.table_actions.map((tableAction) => buildFoundTableActionDTO(tableAction)),
    events: actionRule.action_events.map((actionEvent) => buildFoundActionEventDTO(actionEvent)),
  };
}
