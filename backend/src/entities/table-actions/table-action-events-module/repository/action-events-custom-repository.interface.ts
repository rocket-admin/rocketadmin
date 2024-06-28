import { ActionEventsEntity } from '../action-event.entity.js';

export interface IActionEventsRepository {
  saveNewOrUpdatedActionEvent(event: ActionEventsEntity): Promise<ActionEventsEntity>;
}
