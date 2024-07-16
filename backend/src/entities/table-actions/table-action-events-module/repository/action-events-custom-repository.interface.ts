import { ActionEventsEntity } from '../action-event.entity.js';

export interface IActionEventsRepository {
  saveNewOrUpdatedActionEvent(event: ActionEventsEntity): Promise<ActionEventsEntity>;

  findCustomEventsForTable(connectionId: string, tableName: string): Promise<Array<ActionEventsEntity>>;
}
