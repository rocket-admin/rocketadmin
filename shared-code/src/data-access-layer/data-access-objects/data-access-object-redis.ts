/* eslint-disable security/detect-object-injection */
import * as csv from 'csv';
import getPort from 'get-port';
import { nanoid } from 'nanoid';
import { Readable, Stream } from 'node:stream';
import { createClient, RedisClientType } from 'redis';
import { LRUStorage } from '../../caching/lru-storage.js';
import { getTunnel } from '../../helpers/get-ssh-tunnel.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
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

export class DataAccessObjectRedis extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const redisClient = await this.getClient();
    const key = row.key ? String(row.key) : nanoid();
    const rowKey = `${tableName}:${key}`;
    const dataToStore = { ...row };
    delete dataToStore.key;
    await redisClient.set(rowKey, JSON.stringify(dataToStore));
    return { key };
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();
    if (!primaryKey.key) {
      throw new Error('Primary key "key" is required for Redis operations');
    }
    const rowKey = `${tableName}:${primaryKey.key}`;
    await redisClient.del(rowKey);
    return primaryKey;
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    const redisClient = await this.getClient();
    const results: Array<Record<string, unknown>> = [];

    const pattern = `${tableName}:*`;
    const keys = await redisClient.keys(pattern);

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        try {
          const parsedData = JSON.parse(data as string);
          const keyPart = key.split(':').slice(1).join(':');
          const rowData = { key: keyPart, ...parsedData };
          if (fieldValues.includes(rowData[referencedFieldName])) {
            const result: Record<string, unknown> = {
              [referencedFieldName]: rowData[referencedFieldName],
            };
            if (identityColumnName && rowData[identityColumnName] !== undefined) {
              result[identityColumnName] = rowData[identityColumnName];
            }
            results.push(result);
          }
        } catch (_error) {
          continue;
        }
      }
    }
    return results;
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();
    if (!primaryKey.key) {
      throw new Error('Primary key "key" is required for Redis operations');
    }
    const rowKey = `${tableName}:${primaryKey.key}`;
    const data = await redisClient.get(rowKey);

    if (!data) {
      return null;
    }

    try {
      const parsedData = JSON.parse(data as string);
      const result = { key: primaryKey.key, ...parsedData };
      if (settings) {
        const tableStructure = await this.getTableStructure(tableName);
        const availableFields = this.findAvailableFields(settings, tableStructure);

        if (availableFields.length > 0) {
          const filteredResult: Record<string, unknown> = {};
          for (const field of availableFields) {
            if (result[field] !== undefined) {
              filteredResult[field] = result[field];
            }
          }
          return filteredResult;
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Invalid JSON data for key ${rowKey}: ${error.message}`);
    }
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    const results: Array<Record<string, unknown>> = [];
    for (const primaryKey of primaryKeys) {
      try {
        const row = await this.getRowByPrimaryKey(tableName, primaryKey, settings);
        if (row) {
          results.push(row);
        }
      } catch (_error) {
        continue;
      }
    }
    return results;
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
    const redisClient = await this.getClient();

    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      return await this.getAutocompleteRows(tableName, autocompleteFields);
    }

    const pattern = `${tableName}:*`;
    const allRows: Array<Record<string, unknown>> = [];
    let cursor = '0';
    let processedCount = 0;
    const targetRows = page * perPage;

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        const pipeline = redisClient.multi();
        keys.forEach((key) => pipeline.get(key));
        const results = await pipeline.exec();

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const data = results[i] as unknown as string;

          if (data) {
            try {
              const parsedData = JSON.parse(data);
              const keyPart = key.split(':').slice(1).join(':');
              const rowData = { key: keyPart, ...parsedData };
              const passesFilter = await this.passesFilters(rowData, filteringFields, searchedFieldValue, settings);
              if (passesFilter) {
                allRows.push(rowData);
                processedCount++;
              }
            } catch (_error) {
              continue;
            }
          }
        }

        if (processedCount >= targetRows + perPage && cursor === '0') {
          break;
        }
      }
    } while (cursor !== '0');

    if (settings.ordering_field && settings.ordering) {
      allRows.sort((a, b) => {
        const aVal = a[settings.ordering_field];
        const bVal = b[settings.ordering_field];
        const modifier = settings.ordering === 'ASC' ? 1 : -1;

        if (aVal < bVal) return -1 * modifier;
        if (aVal > bVal) return 1 * modifier;
        return 0;
      });
    }

    const totalRows = allRows.length;
    const offset = (page - 1) * perPage;
    const paginatedRows = allRows.slice(offset, offset + perPage);

    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    const finalRows = paginatedRows.map((row) => {
      if (availableFields.length > 0) {
        const filteredRow: Record<string, unknown> = {};
        availableFields.forEach((field) => {
          if (row[field] !== undefined) {
            filteredRow[field] = row[field];
          }
        });
        return filteredRow;
      }
      return row;
    });

    return {
      data: finalRows,
      pagination: {
        total: totalRows,
        lastPage: Math.ceil(totalRows / perPage),
        perPage: perPage,
        currentPage: page,
      },
      large_dataset: totalRows > 1000,
    };
  }

  public async getTableForeignKeys(_tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }

  public async getTablePrimaryColumns(_tableName: string): Promise<Array<PrimaryKeyDS>> {
    return [
      {
        column_name: 'key',
        data_type: 'string',
      },
    ];
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const redisClient = await this.getClient();

    const allKeys = await redisClient.keys('*');
    const tableNames = new Set<string>();

    allKeys.forEach((key) => {
      const parts = key.split(':');
      if (parts.length >= 2) {
        tableNames.add(parts[0]);
      }
    });

    return Array.from(tableNames).map((tableName) => ({
      tableName: tableName,
      isView: false,
    }));
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    const redisClient = await this.getClient();

    const pattern = `${tableName}:*`;
    const keys = await redisClient.keys(pattern);
    const fieldTypes = new Map<string, string>();

    fieldTypes.set('key', 'string');

    const sampleSize = Math.min(keys.length, 10);
    for (let i = 0; i < sampleSize; i++) {
      const data = await redisClient.get(keys[i]);
      if (data && typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          Object.entries(parsedData).forEach(([field, value]) => {
            if (!fieldTypes.has(field)) {
              fieldTypes.set(field, this.inferRedisDataType(value));
            }
          });
        } catch (_error) {
          continue;
        }
      }
    }

    return Array.from(fieldTypes.entries()).map(([columnName, dataType]) => ({
      column_name: columnName,
      data_type: dataType,
      is_nullable: true,
      allow_null: true,
      column_default: null,
      character_maximum_length: null,
      numeric_precision: null,
      numeric_scale: null,
      datetime_precision: null,
      character_set_name: null,
      collation_name: null,
      data_type_params: '',
      udt_name: dataType,
      extra: columnName === 'key' ? 'primary_key' : null,
    }));
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    if (!this.connection.id) {
      this.connection.id = nanoid(6);
    }
    try {
      const redisClient = await this.getClient();
      const response = await redisClient.ping();

      if (response === 'PONG') {
        return {
          result: true,
          message: 'Successfully connected',
        };
      } else {
        return {
          result: false,
          message: 'Redis ping failed',
        };
      }
    } catch (error) {
      return {
        result: false,
        message: `Connection failed: ${error.message}`,
      };
    } finally {
      LRUStorage.delRedisClientCache(this.connection);
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();

    if (!primaryKey.key) {
      throw new Error('Primary key "key" is required for Redis operations');
    }

    const rowKey = `${tableName}:${primaryKey.key}`;

    const exists = await redisClient.exists(rowKey);
    if (!exists) {
      throw new Error(`Row with key ${primaryKey.key} not found in ${tableName}`);
    }

    const existingData = await redisClient.get(rowKey);
    const existingParsed = existingData ? JSON.parse(existingData as string) : {};

    const updatedData = { ...existingParsed };
    Object.entries(row).forEach(([field, value]) => {
      if (field !== 'key') {
        updatedData[field] = value;
      }
    });
    await redisClient.set(rowKey, JSON.stringify(updatedData));
    return { key: primaryKey.key, ...updatedData };
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const results: Array<Record<string, unknown>> = [];

    for (const primaryKey of primaryKeys) {
      try {
        const updatedRow = await this.updateRowInTable(tableName, newValues, primaryKey);
        results.push(updatedRow);
      } catch (_error) {
        continue;
      }
    }

    return results;
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    const redisClient = await this.getClient();
    let deletedCount = 0;

    for (const primaryKey of primaryKeys) {
      if (primaryKey.key) {
        const rowKey = `${tableName}:${primaryKey.key}`;
        const deleted = await redisClient.del(rowKey);
        deletedCount += deleted;
      }
    }

    return deletedCount;
  }

  public async validateSettings(settings: ValidateTableSettingsDS, _tableName: string): Promise<Array<string>> {
    const errors: string[] = [];

    if (settings.excluded_fields?.includes('key')) {
      errors.push('Cannot exclude the "key" field in Redis tables');
    }

    return errors;
  }

  public async getReferencedTableNamesAndColumns(_tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    return [];
  }

  public async isView(_tableName: string): Promise<boolean> {
    return false;
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<any>> {
    const rowsResult = (await this.getRowsFromTable(
      tableName,
      settings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      null,
    )) as any;
    return rowsResult.data;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);

    const parser = stream.pipe(csv.parse({ columns: true }));
    const results: any[] = [];
    for await (const record of parser) {
      results.push(record);
    }
    try {
      await Promise.allSettled(
        results.map(async (row) => {
          return await this.addRowInTable(tableName, row);
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  public async executeRawQuery(query: string, _tableName: string): Promise<Array<Record<string, unknown>>> {
    const redisClient = await this.getClient();

    try {
      const parts = query.trim().split(/\s+/);
      const command = parts[0].toUpperCase();

      switch (command) {
        case 'GET':
          if (parts.length !== 2) throw new Error('GET requires exactly one key');
          const value = await redisClient.get(parts[1]);
          return [{ key: parts[1], value }];

        case 'KEYS':
          if (parts.length !== 2) throw new Error('KEYS requires exactly one pattern');
          const keys = await redisClient.keys(parts[1]);
          return keys.map((key) => ({ key }));

        case 'PING':
          const response = await redisClient.ping();
          return [{ response }];

        default:
          throw new Error(`Unsupported command: ${command}`);
      }
    } catch (error) {
      throw new Error(`Redis command failed: ${error.message}`);
    }
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.connection.ssh) {
      return await this.createTunneledConnection(this.connection);
    }
    return await this.getUsualConnection();
  }

  private inferRedisDataType(value: any): string {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'decimal';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  private async getAutocompleteRows(tableName: string, autocompleteFields: AutocompleteFieldsDS): Promise<FoundRowsDS> {
    const redisClient = await this.getClient();
    const { fields, value } = autocompleteFields;
    const pattern = `${tableName}:*`;
    const rows: Array<Record<string, unknown>> = [];
    let cursor = '0';
    let processedCount = 0;

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 50,
      });

      cursor = scanResult.cursor;
      const keys = scanResult.keys.slice(0, DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT - processedCount);

      if (keys.length > 0) {
        const pipeline = redisClient.multi();
        keys.forEach((key) => pipeline.get(key));
        const results = await pipeline.exec();

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const data = results[i] as unknown as string;

          if (data) {
            try {
              const parsedData = JSON.parse(data);
              const keyPart = key.split(':').slice(1).join(':');
              const rowData = { key: keyPart, ...parsedData };

              if (
                value === '*' ||
                fields.some((field) =>
                  String(rowData[field] || '')
                    .toLowerCase()
                    .includes(String(value).toLowerCase()),
                )
              ) {
                const autocompleteRow: Record<string, unknown> = {};
                fields.forEach((field) => {
                  if (rowData[field] !== undefined) {
                    autocompleteRow[field] = rowData[field];
                  }
                });
                rows.push(autocompleteRow);
                processedCount++;
              }
            } catch (_error) {
              continue;
            }
          }

          if (processedCount >= DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT) {
            break;
          }
        }
      }

      if (processedCount >= DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT) {
        break;
      }
    } while (cursor !== '0');

    return {
      data: rows,
      pagination: {} as any,
      large_dataset: false,
    };
  }

  private async passesFilters(
    row: Record<string, unknown>,
    filteringFields: Array<FilteringFieldsDS>,
    searchedFieldValue: string,
    settings: TableSettingsDS,
  ): Promise<boolean> {
    if (filteringFields?.length > 0) {
      const filterResults: boolean[] = [];

      for (const filterObject of filteringFields) {
        const { field, criteria, value } = filterObject;
        const rowValue = row[field];
        let result: boolean;

        if (rowValue === undefined) {
          result = false;
        } else {
          switch (criteria) {
            case FilterCriteriaEnum.eq:
              result = rowValue === value;
              break;
            case FilterCriteriaEnum.startswith:
              result = String(rowValue).toLowerCase().startsWith(String(value).toLowerCase());
              break;
            case FilterCriteriaEnum.endswith:
              result = String(rowValue).toLowerCase().endsWith(String(value).toLowerCase());
              break;
            case FilterCriteriaEnum.contains:
              result = String(rowValue).toLowerCase().includes(String(value).toLowerCase());
              break;
            case FilterCriteriaEnum.icontains:
              result = !String(rowValue).toLowerCase().includes(String(value).toLowerCase());
              break;
            case FilterCriteriaEnum.gt:
              result = Number(rowValue) > Number(value);
              break;
            case FilterCriteriaEnum.lt:
              result = Number(rowValue) < Number(value);
              break;
            case FilterCriteriaEnum.gte:
              result = Number(rowValue) >= Number(value);
              break;
            case FilterCriteriaEnum.lte:
              result = Number(rowValue) <= Number(value);
              break;
            case FilterCriteriaEnum.empty:
              result = rowValue === null || rowValue === undefined || rowValue === '';
              break;
            default:
              result = true;
              break;
          }
        }

        filterResults.push(result);
      }
      const passesFiltering = filterResults.every((r) => r);
      if (!passesFiltering) return false;
    }

    if (searchedFieldValue) {
      const searchFields =
        settings.search_fields?.length > 0
          ? settings.search_fields
          : await this.getTableStructure(row.key as string).then((structure) => structure.map((s) => s.column_name));

      const passesSearch = searchFields.some((field) =>
        String(row[field] || '')
          .toLowerCase()
          .includes(searchedFieldValue.toLowerCase()),
      );

      if (!passesSearch) return false;
    }
    return true;
  }

  private async getUsualConnection(): Promise<RedisClientType> {
    let client: RedisClientType = LRUStorage.getRedisClientCache(this.connection);
    if (!client) {
      client = createClient({
        socket: {
          host: this.connection.host,
          port: this.connection.port,
          ca: this.connection.cert || undefined,
          cert: this.connection.cert || undefined,
          rejectUnauthorized: this.connection.ssl === false ? false : true,
        },
        password: this.connection.password || undefined,
      });
      await client.connect();
      LRUStorage.setRedisClientCache(this.connection, client);
    }
    return client;
  }

  private async createTunneledConnection(connection: ConnectionParams): Promise<RedisClientType> {
    const connectionCopy = { ...connection };
    return new Promise<RedisClientType>(async (resolve, reject): Promise<RedisClientType> => {
      const cachedTnl = LRUStorage.getTunnelCache(connectionCopy);
      if (cachedTnl && cachedTnl.redis && cachedTnl.server && cachedTnl.client) {
        resolve(cachedTnl.redis);
        return;
      }

      const freePort = await getPort();

      try {
        const [server, client] = await getTunnel(connectionCopy, freePort);
        connection.host = '127.0.0.1';
        connection.port = freePort;
        const redisClient = await this.getUsualConnection();

        const tnlCachedObj = {
          server: server,
          client: client,
          redis: redisClient,
        };
        LRUStorage.setTunnelCache(connectionCopy, tnlCachedObj);
        resolve(tnlCachedObj.redis);
        client.on('error', (e) => {
          LRUStorage.delTunnelCache(connectionCopy);
          reject(e);
          return;
        });

        server.on('error', (e) => {
          LRUStorage.delTunnelCache(connectionCopy);
          reject(e);
          return;
        });
        return;
      } catch (error) {
        LRUStorage.delTunnelCache(connectionCopy);
        reject(error);
        return;
      }
    });
  }
}
