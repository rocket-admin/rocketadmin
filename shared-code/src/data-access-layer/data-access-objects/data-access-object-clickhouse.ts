/* eslint-disable security/detect-object-injection */
import { createClient, ClickHouseClient } from '@clickhouse/client';
import * as csv from 'csv';
import { Readable, Stream } from 'stream';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
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
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config.js';

export class DataAccessObjectClickHouse extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(tableName: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
    const client = this.getClickHouseClient();
    try {
      await client.insert({
        table: tableName,
        values: [row],
        format: 'JSONEachRow',
      });
      return row;
    } finally {
      await client.close();
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const client = this.getClickHouseClient();
    try {
      const whereClause = this.buildWhereClause(primaryKey);
      const query = `ALTER TABLE ${this.escapeIdentifier(tableName)} DELETE WHERE ${whereClause}`;
      await client.command({ query });
      return primaryKey;
    } finally {
      await client.close();
    }
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    if (!referencedFieldName || !fieldValues.length) {
      return [];
    }
    const client = this.getClickHouseClient();
    try {
      const columnsToSelect = identityColumnName
        ? `${this.escapeIdentifier(referencedFieldName)}, ${this.escapeIdentifier(identityColumnName)}`
        : this.escapeIdentifier(referencedFieldName);

      const placeholders = fieldValues.map((v) => this.sanitizeValue(v)).join(', ');

      const query = `SELECT ${columnsToSelect} FROM ${this.escapeIdentifier(tableName)} WHERE ${this.escapeIdentifier(referencedFieldName)} IN (${placeholders})`;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      return await result.json();
    } finally {
      await client.close();
    }
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const client = this.getClickHouseClient();
    try {
      let availableFields: string[] = [];
      if (settings) {
        const tableStructure = await this.getTableStructure(tableName);
        availableFields = this.findAvailableFields(settings, tableStructure);
      }

      const selectFields =
        availableFields.length > 0 ? availableFields.map((f) => this.escapeIdentifier(f)).join(', ') : '*';
      const whereClause = this.buildWhereClause(primaryKey);

      const query = `SELECT ${selectFields} FROM ${this.escapeIdentifier(tableName)} WHERE ${whereClause} LIMIT 1`;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const rows: Record<string, unknown>[] = await result.json();
      return rows[0] || null;
    } finally {
      await client.close();
    }
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    if (primaryKeys.length === 0) {
      return [];
    }

    const client = this.getClickHouseClient();
    try {
      let availableFields: string[] = [];
      if (settings) {
        const tableStructure = await this.getTableStructure(tableName);
        availableFields = this.findAvailableFields(settings, tableStructure);
      }

      const selectFields =
        availableFields.length > 0 ? availableFields.map((f) => this.escapeIdentifier(f)).join(', ') : '*';

      const whereConditions = primaryKeys.map((pk) => `(${this.buildWhereClause(pk)})`).join(' OR ');

      const query = `SELECT ${selectFields} FROM ${this.escapeIdentifier(tableName)} WHERE ${whereConditions}`;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      return await result.json();
    } finally {
      await client.close();
    }
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    autocompleteFields: AutocompleteFieldsDS,
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const offset = (page - 1) * perPage;
    const client = this.getClickHouseClient();

    try {
      if (!tableStructure) {
        tableStructure = await this.getTableStructure(tableName);
      }
      const availableFields = this.findAvailableFields(settings, tableStructure);

      if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
        const { fields, value } = autocompleteFields;
        const selectFields = fields.map((f) => this.escapeIdentifier(f)).join(', ');

        let whereClause = '1=1';
        if (value !== '*') {
          const conditions = fields.map(
            (field) => `toString(${this.escapeIdentifier(field)}) LIKE '${this.escapeValue(String(value))}%'`,
          );
          whereClause = conditions.join(' OR ');
        }

        const query = `SELECT ${selectFields} FROM ${this.escapeIdentifier(tableName)} WHERE ${whereClause} LIMIT ${DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT}`;

        const result = await client.query({
          query,
          format: 'JSONEachRow',
        });

        const rows: Record<string, unknown>[] = await result.json();
        const { large_dataset } = await this.getRowsCount(client, tableName);

        return {
          data: rows,
          pagination: {} as any,
          large_dataset,
        };
      }

      const selectFields =
        availableFields.length > 0 ? availableFields.map((f) => this.escapeIdentifier(f)).join(', ') : '*';
      const whereClauses: string[] = [];

      let { search_fields } = settings;
      if ((!search_fields || search_fields.length === 0) && searchedFieldValue) {
        search_fields = availableFields;
      }

      if (searchedFieldValue && search_fields?.length > 0) {
        const searchConditions = search_fields.map(
          (field) =>
            `lower(toString(${this.escapeIdentifier(field)})) LIKE '%${this.escapeValue(searchedFieldValue.toLowerCase())}%'`,
        );
        whereClauses.push(`(${searchConditions.join(' OR ')})`);
      }

      if (filteringFields?.length > 0) {
        for (const filterObject of filteringFields) {
          const { field, criteria, value } = filterObject;
          const escapedField = this.escapeIdentifier(field);
          const escapedValue = this.sanitizeValue(value);

          const escapedStringValue = this.escapeValue(String(value));
          switch (criteria) {
            case FilterCriteriaEnum.eq:
              whereClauses.push(`${escapedField} = ${escapedValue}`);
              break;
            case FilterCriteriaEnum.startswith:
              whereClauses.push(`toString(${escapedField}) LIKE '${escapedStringValue}%'`);
              break;
            case FilterCriteriaEnum.endswith:
              whereClauses.push(`toString(${escapedField}) LIKE '%${escapedStringValue}'`);
              break;
            case FilterCriteriaEnum.gt:
              whereClauses.push(`${escapedField} > ${escapedValue}`);
              break;
            case FilterCriteriaEnum.lt:
              whereClauses.push(`${escapedField} < ${escapedValue}`);
              break;
            case FilterCriteriaEnum.gte:
              whereClauses.push(`${escapedField} >= ${escapedValue}`);
              break;
            case FilterCriteriaEnum.lte:
              whereClauses.push(`${escapedField} <= ${escapedValue}`);
              break;
            case FilterCriteriaEnum.contains:
              whereClauses.push(`toString(${escapedField}) LIKE '%${escapedStringValue}%'`);
              break;
            case FilterCriteriaEnum.icontains:
              whereClauses.push(`toString(${escapedField}) NOT LIKE '%${escapedStringValue}%'`);
              break;
            case FilterCriteriaEnum.empty:
              whereClauses.push(`${escapedField} IS NULL`);
              break;
          }
        }
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const orderByClause =
        settings.ordering_field && settings.ordering
          ? `ORDER BY ${this.escapeIdentifier(settings.ordering_field)} ${settings.ordering}`
          : '';

      const query = `SELECT ${selectFields} FROM ${this.escapeIdentifier(tableName)} ${whereClause} ${orderByClause} LIMIT ${perPage} OFFSET ${offset}`;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const rows: Record<string, unknown>[] = await result.json();

      const countQuery = `SELECT count(*) as count FROM ${this.escapeIdentifier(tableName)} ${whereClause}`;
      const countResult = await client.query({
        query: countQuery,
        format: 'JSONEachRow',
      });
      const countData: Array<{ count: number }> = await countResult.json();
      const rowsCount = Number(countData[0]?.count || 0);

      const pagination = {
        total: rowsCount,
        lastPage: Math.ceil(rowsCount / perPage),
        perPage,
        currentPage: page,
      };

      return {
        data: rows,
        pagination,
        large_dataset: rowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
      };
    } finally {
      await client.close();
    }
  }

  public async getTableForeignKeys(_tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }

    const client = this.getClickHouseClient();
    try {
      const query = `
        SELECT name, type
        FROM system.columns
        WHERE database = '${this.escapeValue(this.connection.database || 'default')}'
          AND table = '${this.escapeValue(tableName)}'
          AND is_in_primary_key = 1
        ORDER BY position
      `;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const columns: Array<{ name: string; type: string }> = await result.json();

      const resultKeys = columns.map((column) => ({
        column_name: column.name,
        data_type: this.mapClickHouseType(column.type),
      }));

      LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, resultKeys);
      return resultKeys;
    } finally {
      await client.close();
    }
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const client = this.getClickHouseClient();
    try {
      const database = this.connection.database || 'default';
      const query = `
        SELECT name, engine
        FROM system.tables
        WHERE database = '${this.escapeValue(database)}'
          AND name NOT LIKE '.%'
        ORDER BY name
      `;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const tables: Array<{ name: string; engine: string }> = await result.json();

      return tables.map((table) => ({
        tableName: table.name,
        isView: table.engine === 'View' || table.engine === 'MaterializedView',
      }));
    } finally {
      await client.close();
    }
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }

    const client = this.getClickHouseClient();
    try {
      const database = this.connection.database || 'default';
      const query = `
        SELECT
          name,
          type,
          default_kind,
          default_expression,
          is_in_primary_key
        FROM system.columns
        WHERE database = '${this.escapeValue(database)}'
          AND table = '${this.escapeValue(tableName)}'
        ORDER BY position
      `;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const columns: Array<{
        name: string;
        type: string;
        default_kind: string;
        default_expression: string;
        is_in_primary_key: number;
      }> = await result.json();

      const structure: TableStructureDS[] = columns.map((column) => ({
        column_name: column.name,
        data_type: this.mapClickHouseType(column.type),
        column_default: column.default_expression || null,
        allow_null: this.isNullableType(column.type),
        character_maximum_length: this.extractLength(column.type),
        data_type_params: this.extractTypeParams(column.type),
        udt_name: column.type,
        extra: column.is_in_primary_key ? 'primary_key' : undefined,
      }));

      LRUStorage.setTableStructureCache(this.connection, tableName, structure);
      return structure;
    } finally {
      await client.close();
    }
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const client = this.getClickHouseClient();
    try {
      const result = await client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
      });
      await result.json();

      return {
        result: true,
        message: 'Successfully connected',
      };
    } catch (e) {
      return {
        result: false,
        message: e.message || 'Connection failed',
      };
    } finally {
      await client.close();
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const client = this.getClickHouseClient();
    try {
      const setClause = Object.entries(row)
        .map(([key, value]) => {
          const sanitizedValue = this.sanitizeValue(value);
          return `${this.escapeIdentifier(key)} = ${sanitizedValue}`;
        })
        .join(', ');

      const whereClause = this.buildWhereClause(primaryKey);

      const query = `ALTER TABLE ${this.escapeIdentifier(tableName)} UPDATE ${setClause} WHERE ${whereClause}`;
      await client.command({ query });

      return primaryKey;
    } finally {
      await client.close();
    }
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    if (primaryKeys.length === 0) {
      return [];
    }

    const client = this.getClickHouseClient();
    try {
      const setClause = Object.entries(newValues)
        .map(([key, value]) => {
          const sanitizedValue = this.sanitizeValue(value);
          return `${this.escapeIdentifier(key)} = ${sanitizedValue}`;
        })
        .join(', ');

      const whereConditions = primaryKeys.map((pk) => `(${this.buildWhereClause(pk)})`).join(' OR ');

      const query = `ALTER TABLE ${this.escapeIdentifier(tableName)} UPDATE ${setClause} WHERE ${whereConditions}`;
      await client.command({ query });

      return primaryKeys;
    } finally {
      await client.close();
    }
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    if (primaryKeys.length === 0) {
      return 0;
    }

    const client = this.getClickHouseClient();
    try {
      const whereConditions = primaryKeys.map((pk) => `(${this.buildWhereClause(pk)})`).join(' OR ');

      const query = `ALTER TABLE ${this.escapeIdentifier(tableName)} DELETE WHERE ${whereConditions}`;
      await client.command({ query });

      return primaryKeys.length;
    } finally {
      await client.close();
    }
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(_tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    return [];
  }

  public async isView(tableName: string): Promise<boolean> {
    const client = this.getClickHouseClient();
    try {
      const database = this.connection.database || 'default';
      const query = `
        SELECT engine
        FROM system.tables
        WHERE database = '${this.escapeValue(database)}'
          AND name = '${this.escapeValue(tableName)}'
      `;

      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      const tables: Array<{ engine: string }> = await result.json();

      if (tables.length === 0) {
        throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
      }

      return tables[0].engine === 'View' || tables[0].engine === 'MaterializedView';
    } finally {
      await client.close();
    }
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<any>> {
    const result = await this.getRowsFromTable(
      tableName,
      settings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      null,
      null,
    );

    const stream = new Readable({
      objectMode: true,
      read() {
        for (const row of result.data) {
          this.push(row);
        }
        this.push(null);
      },
    });

    return stream as Stream & AsyncIterable<any>;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const client = this.getClickHouseClient();
    try {
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);

      const parser = stream.pipe(csv.parse({ columns: true }));

      const rows: any[] = [];
      for await (const record of parser) {
        rows.push(record);
      }

      if (rows.length > 0) {
        await client.insert({
          table: tableName,
          values: rows,
          format: 'JSONEachRow',
        });
      }
    } finally {
      await client.close();
    }
  }

  public async executeRawQuery(query: string, _tableName?: string): Promise<Array<Record<string, unknown>>> {
    const client = this.getClickHouseClient();
    try {
      const result = await client.query({
        query,
        format: 'JSONEachRow',
      });

      return await result.json();
    } finally {
      await client.close();
    }
  }

  private escapeIdentifier(identifier: string): string {
    this.validateIdentifier(identifier);
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  private validateIdentifier(identifier: string): void {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Invalid identifier: must be a non-empty string');
    }

    if (identifier.length > 256) {
      throw new Error('Invalid identifier: exceeds maximum length');
    }

    if (/[\x00-\x1f\x7f]/.test(identifier)) {
      throw new Error('Invalid identifier: contains control characters');
    }
  }

  private escapeValue(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('escapeValue expects a string');
    }
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  }

  private sanitizeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Invalid numeric value: must be finite');
      }
      return String(value);
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (typeof value === 'string') {
      return `'${this.escapeValue(value)}'`;
    }
    if (value instanceof Date) {
      return `'${this.escapeValue(value.toISOString())}'`;
    }

    if (typeof value === 'object') {
      return `'${this.escapeValue(JSON.stringify(value))}'`;
    }
    throw new Error(`Unsupported value type: ${typeof value}`);
  }

  private buildWhereClause(conditions: Record<string, unknown>): string {
    if (!conditions || typeof conditions !== 'object') {
      throw new Error('Invalid conditions: must be an object');
    }
    const entries = Object.entries(conditions);
    if (entries.length === 0) {
      throw new Error('Invalid conditions: must have at least one condition');
    }
    return entries
      .map(([key, value]) => {
        const sanitizedValue = this.sanitizeValue(value);
        return `${this.escapeIdentifier(key)} = ${sanitizedValue}`;
      })
      .join(' AND ');
  }

  private mapClickHouseType(clickHouseType: string): string {
    const lowerType = clickHouseType.toLowerCase();

    if (lowerType.startsWith('nullable(')) {
      return this.mapClickHouseType(clickHouseType.slice(9, -1));
    }

    if (lowerType.startsWith('array(')) {
      return 'array';
    }

    if (lowerType.startsWith('map(')) {
      return 'object';
    }

    if (lowerType.startsWith('tuple(')) {
      return 'object';
    }

    if (lowerType.startsWith('enum')) {
      return 'enum';
    }

    if (lowerType.startsWith('fixedstring')) {
      return 'string';
    }

    if (lowerType.startsWith('decimal')) {
      return 'decimal';
    }

    const typeMapping: Record<string, string> = {
      string: 'string',
      uuid: 'uuid',
      bool: 'boolean',
      boolean: 'boolean',
      int8: 'integer',
      int16: 'integer',
      int32: 'integer',
      int64: 'bigint',
      int128: 'bigint',
      int256: 'bigint',
      uint8: 'integer',
      uint16: 'integer',
      uint32: 'integer',
      uint64: 'bigint',
      uint128: 'bigint',
      uint256: 'bigint',
      float32: 'float',
      float64: 'double',
      date: 'date',
      date32: 'date',
      datetime: 'datetime',
      datetime64: 'datetime',
      ipv4: 'string',
      ipv6: 'string',
      json: 'json',
      object: 'object',
    };

    return typeMapping[lowerType] || 'string';
  }

  private isNullableType(type: string): boolean {
    return type.toLowerCase().startsWith('nullable(');
  }

  private extractLength(type: string): number | null {
    const fixedStringMatch = type.match(/FixedString\((\d+)\)/i);
    if (fixedStringMatch) {
      return parseInt(fixedStringMatch[1], 10);
    }
    return null;
  }

  private extractTypeParams(type: string): string | null {
    const enumMatch = type.match(/Enum\d*\(([^)]+)\)/i);
    if (enumMatch) {
      return enumMatch[1];
    }
    return null;
  }

  private async getRowsCount(
    client: ClickHouseClient,
    tableName: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    const query = `SELECT count(*) as count FROM ${this.escapeIdentifier(tableName)}`;
    const result = await client.query({
      query,
      format: 'JSONEachRow',
    });
    const data: Array<{ count: number }> = await result.json();
    const count = Number(data[0]?.count || 0);

    return {
      rowsCount: count,
      large_dataset: count >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
    };
  }

  private getClickHouseClient(): ClickHouseClient {
    const { host, port, username, password, database, ssl, cert } = this.connection;
    const protocol = ssl ? 'https' : 'http';
    const url = `${protocol}://${host}:${port}`;

    const clientConfig: NodeClickHouseClientConfigOptions = {
      url,
      username,
      password,
      database: database || 'default',
    };

    if (ssl && cert) {
      clientConfig.tls = {
        ca_cert: Buffer.from(cert),
      };
    }

    return createClient(clientConfig);
  }
}
