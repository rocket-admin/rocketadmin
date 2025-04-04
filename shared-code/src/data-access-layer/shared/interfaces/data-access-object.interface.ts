import { AutocompleteFieldsDS } from '../data-structures/autocomplete-fields.ds.js';
import { FilteringFieldsDS } from '../data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../data-structures/table-settings.ds.js';
import { TableStructureDS } from '../data-structures/table-structure.ds.js';
import { TestConnectionResultDS } from '../data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../data-structures/validate-table-settings.ds.js';
import { TableDS } from '../data-structures/table.ds.js';
import { Stream } from 'node:stream';

export interface IDataAccessObject {
  addRowInTable(tableName: string, row: Record<string, unknown>): Promise<Record<string, unknown> | number>;

  deleteRowInTable(tableName: string, primaryKey: Record<string, unknown>): Promise<Record<string, unknown>>;

  getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>>;

  getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>>;

  bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>>;

  getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS>;

  getTableForeignKeys(tableName: string): Promise<Array<ForeignKeyDS>>;

  getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>>;

  getTablesFromDB(): Promise<Array<TableDS>>;

  getTableStructure(tableName: string): Promise<Array<TableStructureDS>>;

  testConnect(): Promise<TestConnectionResultDS>;

  updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;

  bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>>;

  bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number>;

  validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>>;

  getReferencedTableNamesAndColumns(tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>>;

  isView(tableName: string): Promise<boolean>;

  getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<any>>;

  importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void>;

  executeRawQuery(query: string, tableName: string): Promise<Array<Record<string, unknown>>>;
}
