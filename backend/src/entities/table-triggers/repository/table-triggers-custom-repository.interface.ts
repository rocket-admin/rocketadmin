import { TableTriggersEntity } from '../table-triggers.entity.js';

export interface ITableTriggersRepository {
  saveNewOrUpdatedTriggers(triggers: TableTriggersEntity): Promise<TableTriggersEntity>;

  findTriggersForTableWithTableActions(connectionId: string, tableName: string): Promise<TableTriggersEntity[]>;

  findTableTriggersWithActionsOnAddRow(connectionId: string, tableName: string): Promise<TableTriggersEntity[]>;

  findTableTriggersWithActionsOnDeleteRow(connectionId: string, tableName: string): Promise<TableTriggersEntity[]>;

  findTableTriggersWithActionsOnUpdateRow(connectionId: string, tableName: string): Promise<TableTriggersEntity[]>;
}
