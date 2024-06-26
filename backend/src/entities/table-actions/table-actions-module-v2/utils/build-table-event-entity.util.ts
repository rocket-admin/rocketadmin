import { CreateTableActionEventDS } from '../../application/data-structures/create-table-action-with-event-and-rule.ds.js';
import { ActionEventsEntity } from '../../table-action-events-module/action-event.entity.js';

export function buildTableActionEventEntity(eventData: CreateTableActionEventDS): ActionEventsEntity {
  const { event, event_title, icon, require_confirmation } = eventData;
  const newActionEventEntity = new ActionEventsEntity();
  newActionEventEntity.event = event;
  newActionEventEntity.title = event_title;
  newActionEventEntity.icon = icon;
  newActionEventEntity.require_confirmation = require_confirmation;
  return newActionEventEntity;
}
