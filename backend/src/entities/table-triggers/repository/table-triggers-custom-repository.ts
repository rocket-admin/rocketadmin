import { TableActionEntity } from '../../table-actions/table-action.entity.js';
import { TableTriggersEntity } from '../table-triggers.entity.js';
import { ITableTriggersRepository } from './table-triggers-custom-repository.interface.js';

export const tableTriggersCustomRepositoryExtension: ITableTriggersRepository = {
  async saveNewOrUpdatedTriggers(triggers: TableTriggersEntity): Promise<TableTriggersEntity> {
    return await this.save(triggers);
  },

  async findTriggersForTableWithTableActions(connectionId: string, tableName: string): Promise<TableTriggersEntity[]> {
    return await this.createQueryBuilder('table_triggers')
      .leftJoinAndSelect('table_triggers.table_actions', 'table_actions')
      .where('table_triggers.connection = :connectionId', { connectionId })
      .andWhere('table_triggers.table_name = :tableName', { tableName })
      .getMany();
  },

  async findTableTriggersWithActionsOnAddRow(connectionId: string, tableName: string): Promise<TableTriggersEntity[]> {
    return await this.createQueryBuilder('table_triggers')
      .leftJoinAndSelect('table_triggers.table_actions', 'table_actions')
      .where('table_triggers.connection = :connectionId', { connectionId })
      .andWhere('table_triggers.table_name = :tableName', { tableName })
      .andWhere('table_triggers.trigger_events @> ARRAY[:triggerEvent]', { triggerEvent: ['ADD_ROW'] })
      .getMany();
  },

  async findTableActionsFromTriggersOnAddRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    const foundTriggersWithAction: TableTriggersEntity[] = await this.findTableTriggersWithActionsOnAddRow(
      connectionId,
      tableName,
    );
    const tableActions: TableActionEntity[] = [];
    foundTriggersWithAction.forEach((trigger) => {
      trigger.table_actions.forEach((action) => {
        tableActions.push(action);
      });
    });
    return tableActions;
  },

  async findTableTriggersWithActionsOnDeleteRow(
    connectionId: string,
    tableName: string,
  ): Promise<TableTriggersEntity[]> {
    return await this.createQueryBuilder('table_triggers')
      .leftJoinAndSelect('table_triggers.table_actions', 'table_actions')
      .where('table_triggers.connection = :connectionId', { connectionId })
      .andWhere('table_triggers.table_name = :tableName', { tableName })
      .andWhere('table_triggers.trigger_events @> ARRAY[:triggerEvent]', { triggerEvent: ['DELETE_ROW'] })
      .getMany();
  },

  async findTableActionsFromTriggersOnDeleteRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    const foundTriggersWithAction: TableTriggersEntity[] = await this.findTableTriggersWithActionsOnDeleteRow(
      connectionId,
      tableName,
    );
    const tableActions: TableActionEntity[] = [];
    foundTriggersWithAction.forEach((trigger) => {
      trigger.table_actions.forEach((action) => {
        tableActions.push(action);
      });
    });
    return tableActions;
  },

  async findTableTriggersWithActionsOnUpdateRow(
    connectionId: string,
    tableName: string,
  ): Promise<TableTriggersEntity[]> {
    return await this.createQueryBuilder('table_triggers')
      .leftJoinAndSelect('table_triggers.table_actions', 'table_actions')
      .where('table_triggers.connection = :connectionId', { connectionId })
      .andWhere('table_triggers.table_name = :tableName', { tableName })
      .andWhere('table_triggers.trigger_events @> ARRAY[:triggerEvent]', { triggerEvent: ['UPDATE_ROW'] })
      .getMany();
  },

  async findTableActionsFromTriggersOnUpdateRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    const foundTriggersWithAction: TableTriggersEntity[] = await this.findTableTriggersWithActionsOnUpdateRow(
      connectionId,
      tableName,
    );
    const tableActions: TableActionEntity[] = [];
    foundTriggersWithAction.forEach((trigger) => {
      trigger.table_actions.forEach((action) => {
        tableActions.push(action);
      });
    });
    return tableActions;
  },
};
