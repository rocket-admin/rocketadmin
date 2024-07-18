import { ActionRulesEntity } from '../../table-action-rules-module/action-rules.entity.js';
import { CreateTableActionEventDS } from '../../table-action-rules-module/application/data-structures/create-action-rules.ds.js';
import { ActionEventsEntity } from '../action-event.entity.js';

export function buildActionEventWithRule(
  actionEventData: CreateTableActionEventDS,
  actionRule: ActionRulesEntity,
): ActionEventsEntity {
  const { event, event_title, icon, require_confirmation, type } = actionEventData;
  const newActionEvent = new ActionEventsEntity();
  newActionEvent.action_rule = actionRule;
  newActionEvent.event = event;
  newActionEvent.title = event_title;
  newActionEvent.icon = icon;
  newActionEvent.type = type;
  newActionEvent.require_confirmation = require_confirmation;
  return newActionEvent;
}
