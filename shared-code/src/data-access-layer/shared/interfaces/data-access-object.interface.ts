import { Knex } from 'knex';
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

export interface IDataAccessObject {
  addRowInTable(tableName: string, row: Record<string, unknown>): Promise<Record<string, unknown> | number>;

  configureKnex(): Promise<Knex<any, any[]>>;

  deleteRowInTable(tableName: string, primaryKey: Record<string, unknown>): Promise<Record<string, unknown>>;

  getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<string>>;

  getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>>;

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

  getTablesFromDB(): Promise<Array<string>>;

  getTableStructure(tableName: string): Promise<Array<TableStructureDS>>;

  testConnect(): Promise<TestConnectionResultDS>;

  updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;

  validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>>;

  getReferencedTableNamesAndColumns(tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>>;
}
