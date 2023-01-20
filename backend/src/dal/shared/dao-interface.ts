import { CreateTableSettingsDto } from '../../entities/table-settings/dto/index.js';
import { IForeignKeyInfo, IPaginationRO } from '../../entities/table/table.interface.js';
import { Knex } from 'knex';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity.js';

export interface IDaoInterface {
  addRowInTable(tableName: string, row, userEmail: string);

  configureKnex?(connectionConfig): Promise<Knex> | Knex;

  deleteRowInTable(tableName: string, primaryKey, userEmail: string);

  getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<string>;

  getRowByPrimaryKey(
    tableName: string,
    primaryKey,
    settings: TableSettingsEntity | Record<string, unknown>,
    userEmail: string,
  );

  getRowsFromTable(
    tableName: string,
    settings: any,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
    userEmail: string,
  );

  getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKeyInfo>>;

  getTablePrimaryColumns(tableName: string, userEmail: string): Promise<Array<IPrimaryKeyInfo>>;

  getTablesFromDB(email?: string);

  getTableStructure(tableName: string, userEmail: string);

  testConnect(): Promise<ITestConnectResult>;

  updateRowInTable(tableName: string, row, primaryKey, userEmail: string);

  validateSettings(settings: CreateTableSettingsDto | Record<string, unknown>, tableName, userEmail: string);
}

export interface IDaoRowsRO {
  data: Array<string>;
  pagination: IPaginationRO | Record<string, unknown>;
}

export interface ITestConnectResult {
  result: boolean;
  message: string;
}

export interface IPrimaryKeyInfo {
  column_name: string;
  data_type: string;
}
