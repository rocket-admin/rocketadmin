import { Knex } from 'knex';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { FilterCriteriaEnum } from '../../enums';

export interface IDataAccessObject {
  addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown> | number>;

  configureKnex?(connectionConfig): Promise<Knex> | Knex;

  deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>>;

  getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>>;

  getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsEntity,
    userEmail: string,
  ): Promise<Record<string, unknown>>;

  getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFieldsData>,
    autocompleteFields: IAutocompleteFieldsData,
    userEmail: string,
  ): Promise<IRows>;

  getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKey>>;

  getTablePrimaryColumns(tableName: string, userEmail: string): Promise<Array<IPrimaryKey>>;

  getTablesFromDB(email?: string): Promise<Array<string>>;

  getTableStructure(tableName: string, userEmail: string): Promise<Array<any>>;

  testConnect(): Promise<ITestConnectResult>;

  updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>>;

  validateSettings(settings: CreateTableSettingsDto, tableName: string, userEmail: string): Promise<Array<string>>;
}

export interface IRows {
  data: Array<Record<string, unknown>>;
  pagination: IPagination;
}

export interface IPagination {
  total: number;
  lastPage: number;
  perPage: number;
  currentPage: number;
}

export interface IForeignKey {
  referenced_column_name: string;
  referenced_table_name: string;
  constraint_name: string;
  column_name: string;
}

export interface ITestConnectResult {
  result: boolean;
  message: string;
}

export interface IPrimaryKey {
  column_name: string;
  data_type: string;
}

export interface IAutocompleteFieldsData {
  fields: Array<string>;
  value: unknown;
}

export interface IFilteringFieldsData {
  field: string;
  criteria: FilterCriteriaEnum;
  value: unknown;
}

export interface ITableStructure {
  column_name: string;
  column_default: string | null;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
  allow_null: boolean;
}
