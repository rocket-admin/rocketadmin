import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';
import { ActionEventsEntity } from '../action-event.entity.js';
import { IActionEventsRepository } from './action-events-custom-repository.interface.js';

export const actionEventsCustomRepositoryExtension: IActionEventsRepository = {
  async saveNewOrUpdatedActionEvent(event: ActionEventsEntity): Promise<ActionEventsEntity> {
    return await this.save(event);
  },

  async findCustomEventsForTable(connectionId: string, tableName: string): Promise<Array<ActionEventsEntity>> {
    return await this.createQueryBuilder('action_events')
      .leftJoin('action_events.action_rule', 'action_rule')
      .leftJoin('action_rule.connection', 'connection')
      .where('connection.id = :connectionId', { connectionId })
      .andWhere('action_rule.table_name = :tableName', { tableName })
      .andWhere('action_events.event = :event', { event: TableActionEventEnum.CUSTOM })
      .getMany();
  },
};
