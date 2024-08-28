import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { TableSettingsEntity } from '../table-settings.entity.js';

export interface ITableSettingsRepository {
  saveNewOrUpdatedSettings(settings: TableSettingsEntity): Promise<TableSettingsEntity>;

  findTableSettingsWithCustomFields(connectionId: string, tableName: string): Promise<TableSettingsEntity>;

  createNewTableSettings(settings: CreateTableSettingsDs): Promise<TableSettingsEntity>;

  findTableSettings(connectionId: string, tableName: string): Promise<TableSettingsEntity>;

  findTableSettingsPure(connectionId: string, tableName: string): Promise<TableSettingsEntity>;

  findTableSettingsInConnectionPure(connectionId: string): Promise<Array<TableSettingsEntity>>;

  findTableSettingsOrReturnEmpty(connectionId: string, tableName: string): Promise<any>;

  removeTableSettings(tableSettings: TableSettingsEntity): Promise<TableSettingsEntity>;

  findTableSettingsInConnection(connectionId: string): Promise<Array<TableSettingsEntity>>;

  findTableSettingsWithTableWidgets(connectionId: string, tableName: string): Promise<TableSettingsEntity>;

  findTableSettingsWithTableActions(connectionId: string, tableName: string): Promise<TableSettingsEntity>;
}
