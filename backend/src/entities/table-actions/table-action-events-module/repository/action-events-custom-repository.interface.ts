import { ActionEventsEntity } from '../action-event.entity.js';

export interface IActionEventsRepository {
  saveNewOrUpdatedActionEvents(event: ActionEventsEntity): Promise<ActionEventsEntity>;
}
