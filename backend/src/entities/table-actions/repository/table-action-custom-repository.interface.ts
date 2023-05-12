import { TableActionEntity } from '../table-action.entity.js';

export interface ITableActionRepository {
  findTableActions(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  saveNewOrUpdatedTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionById(actionId: string): Promise<TableActionEntity>;

  deleteTableActionUseCase(action: TableActionEntity): Promise<TableActionEntity>;
}
