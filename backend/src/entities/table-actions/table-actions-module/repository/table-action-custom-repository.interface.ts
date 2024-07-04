import { TableActionEntity } from '../table-action.entity.js';

export interface ITableActionRepository {
  saveNewOrUpdatedTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionById(actionId: string): Promise<TableActionEntity>;

  deleteTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionsByIds(actionIds: Array<string>): Promise<Array<TableActionEntity>>;

  findTableActionsWithRulesAndEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  findActionsWithCustomEventsByEventIdConnectionId(
    eventId: string,
    connectionId: string,
  ): Promise<Array<TableActionEntity>>;

  findTableActionsWithAddRowEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  findTableActionsWithUpdateRowEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  findTableActionsWithDeleteRowEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;
}
