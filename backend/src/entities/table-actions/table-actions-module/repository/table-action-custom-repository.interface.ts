import { TableActionEntity } from '../table-action.entity.js';

export interface ITableActionRepository {
  findTableActions(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  saveNewOrUpdatedTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionById(actionId: string): Promise<TableActionEntity>;

  deleteTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionsByIds(actionIds: Array<string>): Promise<Array<TableActionEntity>>;

  findTableActionsWithRulesAndEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;
}
