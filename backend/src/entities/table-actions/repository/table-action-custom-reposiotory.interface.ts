import { TableActionEntity } from '../table-action.entity';

export interface ITableActionRepository {
  findTableActions(connectionId: string, tableName: string): Promise<Array<TableActionEntity>>;

  saveNewOrOupdatedTableAction(action: TableActionEntity): Promise<TableActionEntity>;

  findTableActionById(actionId: string): Promise<TableActionEntity>;

  deleteTableActionUseCase(action: TableActionEntity): Promise<TableActionEntity>;
}
