import { Stream } from 'stream';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

export class DataAccessObjectElasticsearch extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    throw new Error('Method not implemented.');
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error('Method not implemented.');
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    throw new Error('Method not implemented.');
  }
  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    throw new Error('Method not implemented.');
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    throw new Error('Method not implemented.');
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS> {
    throw new Error('Method not implemented.');
  }

  public async getTableForeignKeys(tableName: string): Promise<Array<ForeignKeyDS>> {
    throw new Error('Method not implemented.');
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    throw new Error('Method not implemented.');
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    throw new Error('Method not implemented.');
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    throw new Error('Method not implemented.');
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    throw new Error('Method not implemented.');
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new Error('Method not implemented.');
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    throw new Error('Method not implemented.');
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    throw new Error('Method not implemented.');
  }
  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    throw new Error('Method not implemented.');
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    throw new Error('Method not implemented.');
  }

  public async isView(tableName: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<any>> {
    throw new Error('Method not implemented.');
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async executeRawQuery(query: string, tableName: string): Promise<Array<Record<string, unknown>>> {
    throw new Error('Method not implemented.');
  }
}
