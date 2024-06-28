import { ActionEventsEntity } from '../action-event.entity.js';
import { IActionEventsRepository } from './action-events-custom-repository.interface.js';

export const actionEventsCustomRepositoryExtension: IActionEventsRepository = {
  async saveNewOrUpdatedActionEvent(event: ActionEventsEntity): Promise<ActionEventsEntity> {
    return await this.save(event);
  },
};
