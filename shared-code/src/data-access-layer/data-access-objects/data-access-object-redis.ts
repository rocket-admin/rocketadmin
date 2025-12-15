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
import { FilterCriteriaEnum } from '../../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { isRedisConnectionUrl } from '../shared/create-data-access-object.js';

enum RedisTableType {
  PREFIXED_KEYS = 'prefixed_keys',
  LIST = 'list',
  SET = 'set',
  ZSET = 'zset',
  STRING = 'string',
  HASH = 'hash',
}

interface RedisTableMetadata {
  tableName: string;
  tableType: RedisTableType;
  redisKey: string;
}

export class DataAccessObjectRedis extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.addRowToStandaloneTable(tableMetadata, row);
    }

    return this.addRowToPrefixedTable(tableName, row);
  }

  private async addRowToStandaloneTable(
    metadata: RedisTableMetadata,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();

    switch (metadata.tableType) {
      case RedisTableType.LIST: {
        const value = row.value;
        if (value === undefined) {
          throw new Error('Field "value" is required for adding to Redis list');
        }
        const newLength = await redisClient.rPush(metadata.redisKey, String(value));
        return { index: newLength - 1, value };
      }

      case RedisTableType.SET: {
        const value = row.value;
        if (value === undefined) {
          throw new Error('Field "value" is required for adding to Redis set');
        }
        await redisClient.sAdd(metadata.redisKey, String(value));
        return { value };
      }

      case RedisTableType.ZSET: {
        const member = row.member;
        const score = row.score;
        if (member === undefined) {
          throw new Error('Field "member" is required for adding to Redis sorted set');
        }
        const scoreValue = score !== undefined ? Number(score) : 0;
        await redisClient.zAdd(metadata.redisKey, { score: scoreValue, value: String(member) });
        return { member, score: scoreValue };
      }

      case RedisTableType.STRING: {
        const value = row.value;
        if (value === undefined) {
          throw new Error('Field "value" is required for setting Redis string');
        }
        await redisClient.set(metadata.redisKey, String(value));
        return { value };
      }

      case RedisTableType.HASH: {
        const fieldsToSet: Record<string, string> = {};
        Object.entries(row).forEach(([field, value]) => {
          fieldsToSet[field] = String(value);
        });
        if (Object.keys(fieldsToSet).length === 0) {
          throw new Error('At least one field is required for adding to Redis hash');
        }
        await redisClient.hSet(metadata.redisKey, fieldsToSet);
        return row;
      }

      default:
        throw new Error(`Cannot add row to Redis table of type ${metadata.tableType}`);
    }
  }

  private async addRowToPrefixedTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.deleteRowFromStandaloneTable(tableMetadata, primaryKey);
    }

    return this.deleteRowFromPrefixedTable(tableName, primaryKey);
  }

  private async deleteRowFromStandaloneTable(
    metadata: RedisTableMetadata,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();

    switch (metadata.tableType) {
      case RedisTableType.LIST: {
        const index = primaryKey.index;
        if (index === undefined) {
          throw new Error('Primary key "index" is required for deleting from Redis list');
        }
        const placeholder = `__DELETED_${nanoid()}__`;
        await redisClient.lSet(metadata.redisKey, Number(index), placeholder);
        await redisClient.lRem(metadata.redisKey, 1, placeholder);
        return primaryKey;
      }

      case RedisTableType.SET: {
        const value = primaryKey.value;
        if (value === undefined) {
          throw new Error('Primary key "value" is required for deleting from Redis set');
        }
        await redisClient.sRem(metadata.redisKey, String(value));
        return primaryKey;
      }

      case RedisTableType.ZSET: {
        const member = primaryKey.member;
        if (member === undefined) {
          throw new Error('Primary key "member" is required for deleting from Redis sorted set');
        }
        await redisClient.zRem(metadata.redisKey, String(member));
        return primaryKey;
      }

      case RedisTableType.STRING: {
        await redisClient.del(metadata.redisKey);
        return primaryKey;
      }

      case RedisTableType.HASH: {
        const field = primaryKey.field;
        if (field) {
          await redisClient.hDel(metadata.redisKey, String(field));
        } else {
          await redisClient.del(metadata.redisKey);
        }
        return primaryKey;
      }

      default:
        throw new Error(`Cannot delete from Redis table of type ${metadata.tableType}`);
    }
  }

  private async deleteRowFromPrefixedTable(
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
      try {
        const keyType = await redisClient.type(key);
        if (keyType !== 'string') {
          continue;
        }

        const data = await redisClient.get(key);
        if (data) {
          const keyPart = key.split(':').slice(1).join(':');
          let rowData: Record<string, unknown>;
          try {
            const parsedData = JSON.parse(data as string);
            if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
              rowData = { key: keyPart, ...parsedData };
            } else {
              rowData = { key: keyPart, value: parsedData };
            }
          } catch (_error) {
            rowData = { key: keyPart, value: data };
          }
          const fieldValue = rowData[referencedFieldName];
          if (fieldValue !== undefined && fieldValues.includes(fieldValue as string | number)) {
            const result: Record<string, unknown> = {
              [referencedFieldName]: fieldValue,
            };
            if (identityColumnName && rowData[identityColumnName] !== undefined) {
              result[identityColumnName] = rowData[identityColumnName];
            }
            results.push(result);
          }
        }
      } catch (_error) {
        continue;
      }
    }
    return results;
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.getStandaloneRowByPrimaryKey(tableMetadata, primaryKey, settings);
    }

    return this.getPrefixedRowByPrimaryKey(tableName, primaryKey, settings);
  }

  private async getStandaloneRowByPrimaryKey(
    metadata: RedisTableMetadata,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();
    let result: Record<string, unknown> | null = null;

    switch (metadata.tableType) {
      case RedisTableType.LIST: {
        const index = primaryKey.index;
        if (index === undefined) {
          throw new Error('Primary key "index" is required for Redis list operations');
        }
        const value = await redisClient.lIndex(metadata.redisKey, Number(index));
        if (value !== null) {
          result = { index: Number(index), value };
        }
        break;
      }

      case RedisTableType.SET: {
        const value = primaryKey.value;
        if (value === undefined) {
          throw new Error('Primary key "value" is required for Redis set operations');
        }
        const isMember = await redisClient.sIsMember(metadata.redisKey, String(value));
        if (isMember) {
          result = { value: String(value) };
        }
        break;
      }

      case RedisTableType.ZSET: {
        const member = primaryKey.member;
        if (member === undefined) {
          throw new Error('Primary key "member" is required for Redis sorted set operations');
        }
        const score = await redisClient.zScore(metadata.redisKey, String(member));
        if (score !== null) {
          result = { member: String(member), score };
        }
        break;
      }

      case RedisTableType.STRING: {
        const stringData = await redisClient.get(metadata.redisKey);
        if (stringData) {
          result = { value: stringData };
        }
        break;
      }

      case RedisTableType.HASH: {
        const hashData = await redisClient.hGetAll(metadata.redisKey);
        if (Object.keys(hashData).length > 0) {
          result = hashData;
        }
        break;
      }
    }

    if (!result) {
      return null;
    }

    if (settings) {
      const tableStructure = await this.getTableStructure(metadata.tableName);
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
  }

  private async getPrefixedRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();
    if (!primaryKey.key) {
      throw new Error('Primary key "key" is required for Redis operations');
    }
    const rowKey = `${tableName}:${primaryKey.key}`;

    const keyType = await redisClient.type(rowKey);

    let result: Record<string, unknown>;

    if (keyType === 'string') {
      const data = await redisClient.get(rowKey);
      if (!data) {
        return null;
      }
      try {
        const parsedData = JSON.parse(data as string);
        if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
          result = { key: primaryKey.key, ...parsedData };
        } else {
          result = { key: primaryKey.key, value: parsedData };
        }
      } catch (_error) {
        result = { key: primaryKey.key, value: data };
      }
    } else if (keyType === 'hash') {
      const hashData = await redisClient.hGetAll(rowKey);
      if (!hashData || Object.keys(hashData).length === 0) {
        return null;
      }
      result = { key: primaryKey.key, ...hashData };
    } else if (keyType === 'none') {
      return null;
    } else {
      result = { key: primaryKey.key, type: keyType };
    }

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
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    const safeSettings = settings || ({} as TableSettingsDS);

    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : safeSettings.list_per_page > 0
          ? safeSettings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      return await this.getAutocompleteRows(tableName, autocompleteFields);
    }

    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.getStandaloneTableRows(
        tableMetadata,
        safeSettings,
        page,
        perPage,
        searchedFieldValue,
        filteringFields,
        tableStructure,
      );
    }

    return this.getPrefixedTableRows(
      tableName,
      safeSettings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      tableStructure,
    );
  }

  private async getStandaloneTableRows(
    metadata: RedisTableMetadata,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    const redisClient = await this.getClient();
    let allRows: Array<Record<string, unknown>> = [];

    switch (metadata.tableType) {
      case RedisTableType.LIST: {
        const listData = await redisClient.lRange(metadata.redisKey, 0, -1);
        allRows = listData.map((value, index) => ({ index, value }));
        break;
      }

      case RedisTableType.SET: {
        const setData = await redisClient.sMembers(metadata.redisKey);
        allRows = setData.map((value) => ({ value }));
        break;
      }

      case RedisTableType.ZSET: {
        const zsetData = await redisClient.zRangeWithScores(metadata.redisKey, 0, -1);
        allRows = zsetData.map(({ value, score }) => ({ member: value, score }));
        break;
      }

      case RedisTableType.STRING: {
        const stringData = await redisClient.get(metadata.redisKey);
        if (stringData) {
          allRows = [{ value: stringData }];
        }
        break;
      }

      case RedisTableType.HASH: {
        const hashData = await redisClient.hGetAll(metadata.redisKey);
        if (Object.keys(hashData).length > 0) {
          allRows = [hashData];
        }
        break;
      }
    }

    if (filteringFields?.length > 0 || searchedFieldValue) {
      const filteredRows: Array<Record<string, unknown>> = [];
      for (const row of allRows) {
        const passesFilter = await this.passesFilters(
          row,
          filteringFields,
          searchedFieldValue,
          settings,
          metadata.tableName,
        );
        if (passesFilter) {
          filteredRows.push(row);
        }
      }
      allRows = filteredRows;
    }

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

    if (!tableStructure) {
      tableStructure = await this.getTableStructure(metadata.tableName);
    }

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

  private async getPrefixedTableRows(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    const redisClient = await this.getClient();
    const pattern = `${tableName}:*`;
    const allRows: Array<Record<string, unknown>> = [];
    let cursor = '0';

    do {
      const scanResult = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 1000,
      });

      cursor = String(scanResult.cursor);
      const keys = scanResult.keys;

      if (keys.length > 0) {
        const keyTypes: Array<{ key: string; type: string }> = [];
        for (const key of keys) {
          try {
            const type = await redisClient.type(key);
            keyTypes.push({ key, type });
          } catch (_error) {
            continue;
          }
        }

        const stringKeys = keyTypes.filter(({ type }) => type === 'string');

        if (stringKeys.length > 0) {
          const pipeline = redisClient.multi();
          stringKeys.forEach(({ key }) => pipeline.get(key));
          const results = await pipeline.exec();

          if (results) {
            for (let i = 0; i < stringKeys.length; i++) {
              const key = stringKeys[i].key;
              const result = results[i];
              let data: string | null = null;
              if (Array.isArray(result)) {
                const [error, value] = result;
                if (!error && value !== null) {
                  data = value as string;
                }
              } else {
                data = result as unknown as string;
              }

              if (data) {
                const keyPart = key.split(':').slice(1).join(':');
                let rowData: Record<string, unknown>;
                try {
                  const parsedData = JSON.parse(data);
                  if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
                    rowData = { key: keyPart, ...parsedData };
                  } else {
                    rowData = { key: keyPart, value: parsedData };
                  }
                } catch (_error) {
                  rowData = { key: keyPart, value: data };
                }
                const passesFilter = await this.passesFilters(
                  rowData,
                  filteringFields,
                  searchedFieldValue,
                  settings,
                  tableName,
                );
                if (passesFilter) {
                  allRows.push(rowData);
                }
              }
            }
          }
        }

        const nonStringKeys = keyTypes.filter(({ type }) => type !== 'string');
        for (const { key, type } of nonStringKeys) {
          try {
            let rowData: Record<string, unknown> = {};
            const keyPart = key.split(':').slice(1).join(':');
            rowData.key = keyPart;

            switch (type) {
              case 'list':
                const listData = await redisClient.lRange(key, 0, -1);
                rowData.value = listData;
                break;
              case 'set':
                const setData = await redisClient.sMembers(key);
                rowData.value = setData;
                break;
              case 'zset':
                const zsetData = await redisClient.zRangeWithScores(key, 0, -1);
                rowData.value = zsetData;
                break;
              case 'hash':
                const hashData = await redisClient.hGetAll(key);
                rowData = { key: keyPart, ...hashData };
                break;
              default:
                rowData.value = `[${type}]`;
                break;
            }

            const passesFilter = await this.passesFilters(
              rowData,
              filteringFields,
              searchedFieldValue,
              settings,
              tableName,
            );
            if (passesFilter) {
              allRows.push(rowData);
            }
          } catch (_error) {
            continue;
          }
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

    if (!tableStructure) {
      tableStructure = await this.getTableStructure(tableName);
    }

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

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    const tableMetadata = this.parseTableName(tableName);

    switch (tableMetadata.tableType) {
      case RedisTableType.LIST:
        return [{ column_name: 'index', data_type: 'integer' }];

      case RedisTableType.SET:
        return [{ column_name: 'value', data_type: 'string' }];

      case RedisTableType.ZSET:
        return [{ column_name: 'member', data_type: 'string' }];

      case RedisTableType.STRING:
        return [{ column_name: 'value', data_type: 'string' }];

      case RedisTableType.HASH:
        const structure = await this.getTableStructure(tableName);
        if (structure.length > 0) {
          return [{ column_name: structure[0].column_name, data_type: structure[0].data_type }];
        }
        return [{ column_name: 'field', data_type: 'string' }];

      case RedisTableType.PREFIXED_KEYS:
      default:
        return [{ column_name: 'key', data_type: 'string' }];
    }
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const redisClient = await this.getClient();

    const allKeys = await this.getAllKeysWithTimeout(redisClient);
    const prefixedTableNames = new Set<string>();
    const standaloneKeys: Array<{ key: string; type: string }> = [];

    for (const key of allKeys) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        prefixedTableNames.add(parts[0]);
      } else {
        try {
          const keyType = await redisClient.type(key);
          //  if (keyType !== 'none') {
          standaloneKeys.push({ key, type: keyType });
          //  }
        } catch (_error) {
          continue;
        }
      }
    } 

    const tables: Array<TableDS> = [];

    for (const tableName of prefixedTableNames) {
      tables.push({
        tableName: tableName,
        isView: false,
      });
    }

    for (const { key, type } of standaloneKeys) {
      tables.push({
        tableName: `[${type}]${key}`,
        isView: false,
      });
    }

    return tables;
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.getStandaloneTableStructure(tableMetadata);
    }

    return this.getPrefixedTableStructure(tableName);
  }

  private async getStandaloneTableStructure(metadata: RedisTableMetadata): Promise<Array<TableStructureDS>> {
    const createColumn = (columnName: string, dataType: string, isPrimaryKey: boolean = false): TableStructureDS => ({
      column_name: columnName,
      data_type: dataType,
      allow_null: !isPrimaryKey,
      column_default: null,
      character_maximum_length: null,
      data_type_params: '',
      udt_name: dataType,
      extra: isPrimaryKey ? 'primary_key' : null,
    });

    switch (metadata.tableType) {
      case RedisTableType.LIST:
        return [createColumn('index', 'integer', true), createColumn('value', 'string', false)];

      case RedisTableType.SET:
        return [createColumn('value', 'string', true)];

      case RedisTableType.ZSET:
        return [createColumn('member', 'string', true), createColumn('score', 'decimal', false)];

      case RedisTableType.STRING:
        return [createColumn('value', 'string', true)];

      case RedisTableType.HASH: {
        const redisClient = await this.getClient();
        const hashData = await redisClient.hGetAll(metadata.redisKey);
        const columns: TableStructureDS[] = [];

        Object.entries(hashData).forEach(([field, value]) => {
          columns.push(createColumn(field, this.inferRedisDataType(value), columns.length === 0));
        });

        if (columns.length === 0) {
          columns.push(createColumn('field', 'string', true));
          columns.push(createColumn('value', 'string', false));
        }

        return columns;
      }

      default:
        return [createColumn('value', 'string', true)];
    }
  }

  private async getPrefixedTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    const redisClient = await this.getClient();
    const pattern = `${tableName}:*`;
    const keys = await redisClient.keys(pattern);
    const fieldTypes = new Map<string, string>();
    fieldTypes.set('key', 'string');

    const sampleSize = Math.min(keys.length, 10);
    for (let i = 0; i < sampleSize; i++) {
      try {
        const keyType = await redisClient.type(keys[i]);
        if (keyType === 'string') {
          const data = await redisClient.get(keys[i]);
          if (data && typeof data === 'string') {
            try {
              const parsedData = JSON.parse(data);
              if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
                Object.entries(parsedData).forEach(([field, value]) => {
                  if (!fieldTypes.has(field)) {
                    fieldTypes.set(field, this.inferRedisDataType(value));
                  }
                });
              } else {
                if (!fieldTypes.has('value')) {
                  fieldTypes.set('value', this.inferRedisDataType(parsedData));
                }
              }
            } catch (_error) {
              if (!fieldTypes.has('value')) {
                fieldTypes.set('value', 'string');
              }
            }
          }
        } else if (keyType === 'hash') {
          const hashData = await redisClient.hGetAll(keys[i]);
          Object.entries(hashData).forEach(([field, value]) => {
            if (!fieldTypes.has(field)) {
              fieldTypes.set(field, this.inferRedisDataType(value));
            }
          });
        } else {
          fieldTypes.set('value', keyType);
        }
      } catch (_error) {
        continue;
      }
    }

    return Array.from(fieldTypes.entries()).map(([columnName, dataType]) => ({
      column_name: columnName,
      data_type: dataType,
      allow_null: true,
      column_default: null,
      character_maximum_length: null,
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
    const tableMetadata = this.parseTableName(tableName);

    if (tableMetadata.tableType !== RedisTableType.PREFIXED_KEYS) {
      return this.updateRowInStandaloneTable(tableMetadata, row, primaryKey);
    }

    return this.updateRowInPrefixedTable(tableName, row, primaryKey);
  }

  private async updateRowInStandaloneTable(
    metadata: RedisTableMetadata,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const redisClient = await this.getClient();

    switch (metadata.tableType) {
      case RedisTableType.LIST: {
        const index = primaryKey.index;
        if (index === undefined) {
          throw new Error('Primary key "index" is required for updating Redis list');
        }
        const newValue = row.value;
        if (newValue === undefined) {
          throw new Error('Field "value" is required for updating Redis list');
        }
        await redisClient.lSet(metadata.redisKey, Number(index), String(newValue));
        return { index: Number(index), value: newValue };
      }

      case RedisTableType.SET: {
        const oldValue = primaryKey.value;
        const newValue = row.value;
        if (oldValue === undefined) {
          throw new Error('Primary key "value" is required for updating Redis set');
        }
        if (newValue === undefined) {
          throw new Error('Field "value" is required for updating Redis set');
        }
        await redisClient.sRem(metadata.redisKey, String(oldValue));
        await redisClient.sAdd(metadata.redisKey, String(newValue));
        return { value: newValue };
      }

      case RedisTableType.ZSET: {
        const member = primaryKey.member;
        if (member === undefined) {
          throw new Error('Primary key "member" is required for updating Redis sorted set');
        }
        const newScore = row.score;
        const newMember = row.member;

        if (newMember !== undefined && newMember !== member) {
          const oldScore = await redisClient.zScore(metadata.redisKey, String(member));
          await redisClient.zRem(metadata.redisKey, String(member));
          const scoreToUse = newScore !== undefined ? Number(newScore) : oldScore || 0;
          await redisClient.zAdd(metadata.redisKey, { score: scoreToUse, value: String(newMember) });
          return { member: newMember, score: scoreToUse };
        } else if (newScore !== undefined) {
          await redisClient.zAdd(metadata.redisKey, { score: Number(newScore), value: String(member) });
          return { member, score: Number(newScore) };
        }
        const currentScore = await redisClient.zScore(metadata.redisKey, String(member));
        return { member, score: currentScore };
      }

      case RedisTableType.STRING: {
        const newValue = row.value;
        if (newValue === undefined) {
          throw new Error('Field "value" is required for updating Redis string');
        }
        await redisClient.set(metadata.redisKey, String(newValue));
        return { value: newValue };
      }

      case RedisTableType.HASH: {
        const fieldsToSet: Record<string, string> = {};
        Object.entries(row).forEach(([field, value]) => {
          fieldsToSet[field] = String(value);
        });
        if (Object.keys(fieldsToSet).length > 0) {
          await redisClient.hSet(metadata.redisKey, fieldsToSet);
        }
        const updatedData = await redisClient.hGetAll(metadata.redisKey);
        return updatedData;
      }

      default:
        throw new Error(`Cannot update Redis table of type ${metadata.tableType}`);
    }
  }

  private async updateRowInPrefixedTable(
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

    const keyType = await redisClient.type(rowKey);

    if (keyType === 'hash') {
      const updateFields: Record<string, any> = {};
      Object.entries(row).forEach(([field, value]) => {
        if (field !== 'key') {
          updateFields[field] = String(value);
        }
      });
      if (Object.keys(updateFields).length > 0) {
        await redisClient.hSet(rowKey, updateFields);
      }
      const updatedData = await redisClient.hGetAll(rowKey);
      return { key: primaryKey.key, ...updatedData };
    } else if (keyType === 'string') {
      const existingData = await redisClient.get(rowKey);
      let existingParsed: Record<string, unknown> = {};

      if (existingData) {
        try {
          const parsed = JSON.parse(existingData as string);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            existingParsed = parsed;
          } else {
            if (row.value !== undefined) {
              await redisClient.set(rowKey, String(row.value));
              return { key: primaryKey.key, value: row.value };
            }
            existingParsed = { value: parsed };
          }
        } catch (_error) {
          if (row.value !== undefined) {
            await redisClient.set(rowKey, String(row.value));
            return { key: primaryKey.key, value: row.value };
          }
          existingParsed = { value: existingData };
        }
      }

      const updatedData = { ...existingParsed };
      Object.entries(row).forEach(([field, value]) => {
        if (field !== 'key') {
          updatedData[field] = value;
        }
      });
      await redisClient.set(rowKey, JSON.stringify(updatedData));
      return { key: primaryKey.key, ...updatedData };
    } else {
      throw new Error(`Cannot update Redis key of type ${keyType}`);
    }
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
    let deletedCount = 0;

    for (const primaryKey of primaryKeys) {
      try {
        await this.deleteRowInTable(tableName, primaryKey);
        deletedCount++;
      } catch (_error) {
        continue;
      }
    }

    return deletedCount;
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    const errors: string[] = [];
    const tableMetadata = this.parseTableName(tableName);

    switch (tableMetadata.tableType) {
      case RedisTableType.PREFIXED_KEYS:
        if (settings.excluded_fields?.includes('key')) {
          errors.push('Cannot exclude the "key" field in prefixed Redis tables');
        }
        break;

      case RedisTableType.LIST:
        if (settings.excluded_fields?.includes('index')) {
          errors.push('Cannot exclude the "index" field in Redis list tables');
        }
        break;

      case RedisTableType.SET:
      case RedisTableType.STRING:
        if (settings.excluded_fields?.includes('value')) {
          errors.push('Cannot exclude the "value" field in Redis set/string tables');
        }
        break;

      case RedisTableType.ZSET:
        if (settings.excluded_fields?.includes('member')) {
          errors.push('Cannot exclude the "member" field in Redis sorted set tables');
        }
        break;
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

  private parseTableName(tableName: string): RedisTableMetadata {
    const standalonePattern = /^\[(list|set|zset|string|hash)\](.+)$/;
    const match = tableName.match(standalonePattern);

    if (match) {
      const type = match[1] as 'list' | 'set' | 'zset' | 'string' | 'hash';
      const redisKey = match[2];
      return {
        tableName,
        tableType: RedisTableType[type.toUpperCase() as keyof typeof RedisTableType],
        redisKey,
      };
    }

    return {
      tableName,
      tableType: RedisTableType.PREFIXED_KEYS,
      redisKey: tableName,
    };
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

      cursor = String(scanResult.cursor);
      const keys = scanResult.keys.slice(0, DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT - processedCount);

      if (keys.length > 0) {
        const stringKeys: string[] = [];
        for (const key of keys) {
          try {
            const type = await redisClient.type(key);
            if (type === 'string') {
              stringKeys.push(key);
            }
          } catch (_error) {
            continue;
          }
        }

        if (stringKeys.length > 0) {
          const pipeline = redisClient.multi();
          stringKeys.forEach((key) => pipeline.get(key));
          const results = await pipeline.exec();

          if (results) {
            for (let i = 0; i < stringKeys.length; i++) {
              const key = stringKeys[i];
              const result = results[i];

              let data: string | null = null;
              if (Array.isArray(result)) {
                const [error, value] = result;
                if (!error && value !== null) {
                  data = value as string;
                }
              } else {
                data = result as unknown as string;
              }

              if (data) {
                const keyPart = key.split(':').slice(1).join(':');
                let rowData: Record<string, unknown>;
                try {
                  const parsedData = JSON.parse(data);
                  if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
                    rowData = { key: keyPart, ...parsedData };
                  } else {
                    rowData = { key: keyPart, value: parsedData };
                  }
                } catch (_error) {
                  rowData = { key: keyPart, value: data };
                }

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
              }

              if (processedCount >= DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT) {
                break;
              }
            }
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
    tableName: string,
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
          : await this.getTableStructure(tableName).then((structure) => structure.map((s) => s.column_name));

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
    const database = this.connection.database
      ? Number(this.connection.database)
        ? Number(this.connection.database)
        : 0
      : 0;
    try {
      if (!client) {
        const shouldUseTLS = this.connection.ssl !== false;
        const isConnectionUrl = isRedisConnectionUrl(this.connection.host);

        const socketConfig: any = {
          host: this.connection.host,
          port: this.connection.port,
          reconnectStrategy: (retries: number) => {
            if (retries > 3) {
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          },
        };

        if (shouldUseTLS) {
          socketConfig.tls = true;
          socketConfig.rejectUnauthorized = this.connection.ssl === false ? false : true;

          if (this.connection.cert) {
            socketConfig.ca = this.connection.cert;
            socketConfig.cert = this.connection.cert;
          }
        }

        client = createClient({
          socket: isConnectionUrl ? undefined : socketConfig,
          url: isConnectionUrl ? this.connection.host : undefined,
          password: isConnectionUrl ? undefined : this.connection.password ? this.connection.password : undefined,
          username: isConnectionUrl ? undefined : this.connection.username ? this.connection.username : undefined,
          database: database,
        });

        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
          LRUStorage.delRedisClientCache(this.connection);
        });

        await client.connect();
        LRUStorage.setRedisClientCache(this.connection, client);
      }
      return client;
    } catch (error) {
      LRUStorage.delRedisClientCache(this.connection);
      throw error;
    }
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

  private async getAllKeysWithScan(redisClient: RedisClientType, pattern: string = '*'): Promise<string[]> {
    const allKeys: string[] = [];
    const scanOptions = { MATCH: pattern, COUNT: 1000 };
    let cursor = '0';

    do {
      const result = await redisClient.scan(cursor, scanOptions);
      cursor = result.cursor.toString();
      allKeys.push(...result.keys);
    } while (cursor !== '0');

    return allKeys;
  }

  private async getAllKeysWithTimeout(
    redisClient: RedisClientType,
    timeoutMs: number = 5000,
  ): Promise<string[]> {
    const keysPromise = redisClient.keys('*');

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const result = await Promise.race([keysPromise, timeoutPromise]);

    if (result === null) {
      return this.getAllKeysWithScan(redisClient);
    }

    return result;
  }
}
