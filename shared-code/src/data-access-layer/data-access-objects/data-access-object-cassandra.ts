/* eslint-disable security/detect-object-injection */
import * as cassandra from 'cassandra-driver';
import * as csv from 'csv';
import getPort from 'get-port';
import { Readable, Stream } from 'stream';
import { validate as isUuid } from 'uuid';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { getTunnel } from '../../helpers/get-ssh-tunnel.js';
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
import { QueryOrderingEnum } from '../shared/enums/query-ordering.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

export class DataAccessObjectCassandra extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    try {
      const client = await this.getCassandraClient();
      const columns = Object.keys(row).map((col) => col.toLowerCase());
      const values = Object.values(row);
      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT INTO ${tableName.toLowerCase()} (${columns.join(', ')}) VALUES (${placeholders})`;
      await client.execute(query, values, { prepare: true });
      return row;
    } catch (error) {
      throw new Error(`Failed to add row in table: ${error.message}`);
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const client = await this.getCassandraClient();
      const primaryKeys = await this.getTablePrimaryColumns(tableName);
      const whereConditions = [];
      const params = [];
      for (const key of primaryKeys) {
        const keyName = key.column_name;
        if (primaryKey[keyName] !== undefined) {
          whereConditions.push(`${keyName} = ?`);
          params.push(primaryKey[keyName]);
        }
      }
      if (whereConditions.length === 0) {
        throw new Error('No primary key values provided for deletion');
      }
      const deleteQuery = `DELETE FROM ${tableName.toLowerCase()} WHERE ${whereConditions.join(' AND ')}`;
      await client.execute(deleteQuery, params, { prepare: true });
      return primaryKey;
    } catch (error) {
      throw new Error(`Failed to delete row in table: ${error.message}`);
    }
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const client = await this.getCassandraClient();
      const results = [];
      for (const value of fieldValues) {
        const query = `SELECT ${identityColumnName.toLowerCase()} FROM ${tableName.toLowerCase()} WHERE ${referencedFieldName.toLowerCase()} = ? ALLOW FILTERING`;
        const result = await client.execute(query, [value], { prepare: true });
        for (const row of result.rows) {
          results.push(row);
        }
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to get identity columns: ${error.message}`);
    }
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    try {
      const client = await this.getCassandraClient();
      let availableFields: string[] = [];
      if (settings) {
        const tableStructure = await this.getTableStructure(tableName);
        availableFields = this.findAvailableFields(settings, tableStructure);
      }
      const primaryKeys = await this.getTablePrimaryColumns(tableName);

      const whereConditions = [];
      const params = [];
      for (const key of primaryKeys) {
        const keyName = key.column_name;
        if (primaryKey[keyName] !== undefined) {
          whereConditions.push(`${keyName} = ?`);
          params.push(primaryKey[keyName]);
        }
      }
      if (whereConditions.length === 0) {
        throw new Error('No primary key values provided');
      }
      const fieldsToSelect = availableFields.length ? availableFields.join(', ') : '*';
      const query = `SELECT ${fieldsToSelect} FROM ${tableName.toLowerCase()} WHERE ${whereConditions.join(' AND ')}`;
      const result = await client.execute(query, params, { prepare: true });
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get row by primary key: ${error.message}`);
    }
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const client = await this.getCassandraClient();
      let availableFields: string[] = [];
      if (settings) {
        const tableStructure = await this.getTableStructure(tableName);
        availableFields = this.findAvailableFields(settings, tableStructure);
      }
      const tablePrimaryKeys = await this.getTablePrimaryColumns(tableName);
      const results = [];
      for (const primaryKey of primaryKeys) {
        const whereConditions = [];
        const params = [];
        for (const key of tablePrimaryKeys) {
          const keyName = key.column_name;
          if (primaryKey[keyName] !== undefined) {
            whereConditions.push(`${keyName} = ?`);
            params.push(primaryKey[keyName]);
          }
        }
        if (whereConditions.length === 0) {
          continue;
        }
        const fieldsToSelect = availableFields.length ? availableFields.join(', ') : '*';
        const query = `SELECT ${fieldsToSelect} FROM ${tableName.toLowerCase()} WHERE ${whereConditions.join(' AND ')}`;
        const result = await client.execute(query, params, { prepare: true });
        for (const row of result.rows) {
          results.push(row);
        }
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to bulk get rows from table by primary keys: ${error.message}`);
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
  ): Promise<FoundRowsDS> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
    try {
      const client = await this.getCassandraClient();
      const tableStructure = await this.getTableStructure(tableName);
      const availableFields = this.findAvailableFields(settings, tableStructure);

      if (autocompleteFields?.value && autocompleteFields?.fields?.length > 0) {
        const { fields, value } = autocompleteFields;
        const selectFields = fields.length > 0 ? fields.map((f) => f.toLowerCase()).join(', ') : '*';
        const allRows: any[] = [];
        const seen = new Set();
        for (const field of fields) {
          const query = `SELECT ${selectFields} FROM ${tableName.toLowerCase()} WHERE ${field.toLowerCase()} = ? ALLOW FILTERING LIMIT ${DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT}`;
          const result = await client.execute(query, [value], { prepare: true });
          for (const row of result.rows) {
            const key = JSON.stringify(row);
            if (!seen.has(key)) {
              seen.add(key);
              allRows.push(row);
            }
          }
        }
        return {
          data: allRows,
          pagination: {
            total: allRows.length,
            lastPage: 1,
            perPage: allRows.length,
            currentPage: 1,
          },
          large_dataset: allRows.length > DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
        };
      }

      const whereConditions: string[] = [];
      const params: any[] = [];

      let { search_fields } = settings;
      if ((!search_fields || search_fields.length === 0) && searchedFieldValue) {
        search_fields = availableFields;
      }

      if (searchedFieldValue && search_fields?.length > 0) {
        for (const field of search_fields) {
          const fieldDef = tableStructure.find((col) => col.column_name === field);
          if (!fieldDef) continue;
          const type = fieldDef.data_type;
          let valid = false;
          let param;
          if (type === 'uuid' && isUuid(searchedFieldValue)) {
            valid = true;
            param = searchedFieldValue;
          } else if ((type === 'int' || type === 'bigint') && !isNaN(Number(searchedFieldValue))) {
            valid = true;
            param = Number(searchedFieldValue);
          } else if (type === 'date') {
            if (typeof searchedFieldValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(searchedFieldValue)) {
              valid = true;
              param = searchedFieldValue;
            }
          } else if (type !== 'uuid' && type !== 'int' && type !== 'bigint') {
            valid = true;
            param = searchedFieldValue;
          }
          if (valid) {
            whereConditions.push(`${field.toLowerCase()} = ?`);
            params.push(param);
            break;
          }
        }
      }

      if (filteringFields?.length) {
        for (const filter of filteringFields) {
          if (filter.value !== undefined && filter.value !== null) {
            switch (filter.criteria) {
              case FilterCriteriaEnum.eq:
                whereConditions.push(`${filter.field.toLowerCase()} = ?`);
                params.push(filter.value);
                break;
              case FilterCriteriaEnum.gt:
                whereConditions.push(`${filter.field.toLowerCase()} > ?`);
                params.push(filter.value);
                break;
              case FilterCriteriaEnum.lt:
                whereConditions.push(`${filter.field.toLowerCase()} < ?`);
                params.push(filter.value);
                break;
              case FilterCriteriaEnum.gte:
                whereConditions.push(`${filter.field.toLowerCase()} >= ?`);
                params.push(filter.value);
                break;
              case FilterCriteriaEnum.lte:
                whereConditions.push(`${filter.field.toLowerCase()} <= ?`);
                params.push(filter.value);
                break;
              default:
                break;
            }
          }
        }
      }

      const selectFields = availableFields.length > 0 ? availableFields.map((f) => f.toLowerCase()).join(', ') : '*';
      let query = `SELECT ${selectFields} FROM ${tableName.toLowerCase()}`;
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')} ALLOW FILTERING`;
      }

      const countQuery =
        `SELECT COUNT(*) as count FROM ${tableName.toLowerCase()}` +
        (whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')} ALLOW FILTERING` : '');
      const countResult = await client.execute(countQuery, params, { prepare: true });
      const totalCount = parseInt(countResult.rows[0].count?.toString() || '0', 10);

      const result = await client.execute(query, params, { prepare: true });
      const startIndex = (page - 1) * perPage;

      const allRows = [...result.rows];
      if (settings?.ordering_field && settings?.ordering) {
        const orderingField = settings.ordering_field.toLowerCase();
        const direction = settings.ordering === QueryOrderingEnum.DESC ? -1 : 1;

        allRows.sort((a, b) => {
          const valueA = a[orderingField];
          const valueB = b[orderingField];
          if (valueA === null || valueA === undefined) return direction * -1;
          if (valueB === null || valueB === undefined) return direction;
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            return (valueA - valueB) * direction;
          } else if (valueA instanceof Date && valueB instanceof Date) {
            return (valueA.getTime() - valueB.getTime()) * direction;
          } else {
            return String(valueA).localeCompare(String(valueB)) * direction;
          }
        });
      }

      const rows = allRows.slice(startIndex, startIndex + perPage);

      const pagination = {
        total: totalCount,
        lastPage: Math.ceil(totalCount / perPage),
        perPage,
        currentPage: page,
      };

      return {
        data: rows,
        pagination,
        large_dataset: totalCount > DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
      };
    } catch (error) {
      throw new Error(`Failed to get rows from table: ${error.message}`);
    }
  }

  public async getTableForeignKeys(_tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }
  private cassandraTypeToReadable(type: any): string {
    if (typeof type === 'string') return type;
    if (type && typeof type === 'object') {
      if (type.info && type.info.name) return type.info.name;
      if (type.code !== undefined) {
        switch (type.code) {
          case 4:
            return 'int';
          case 5:
            return 'bigint';
          case 6:
            return 'varint';
          case 7:
            return 'decimal';
          case 8:
            return 'boolean';
          case 9:
            return 'float';
          case 10:
            return 'double';
          case 12:
            return 'text';
          case 13:
            return 'varchar';
          case 16:
            return 'uuid';
          case 17:
            return 'timeuuid';
          case 19:
            return 'timestamp';
          case 20:
            return 'inet';
          case 21:
            return 'date';
          case 22:
            return 'time';
          case 32:
            return 'list';
          case 33:
            return 'map';
          case 34:
            return 'set';
          case 0:
            return 'custom';
          default:
            return `type_code_${type.code}`;
        }
      }
    }
    return 'unknown';
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    try {
      const client = await this.getCassandraClient();
      const keyspaceMetadata = client.metadata.keyspaces[this.connection.database];
      if (!keyspaceMetadata) {
        throw new Error(`Keyspace ${this.connection.database} not found`);
      }
      const tableMetadata = await client.metadata.getTable(this.connection.database, tableName.toLowerCase());
      if (!tableMetadata) {
        throw new Error(`Table ${tableName} not found`);
      }
      const primaryKeys: Array<PrimaryKeyDS> = [];
      tableMetadata.partitionKeys.forEach((column) => {
        primaryKeys.push({
          column_name: column.name,
          data_type: this.cassandraTypeToReadable(column.type),
        });
      });
      tableMetadata.clusteringKeys.forEach((column) => {
        primaryKeys.push({
          column_name: column.name,
          data_type: this.cassandraTypeToReadable(column.type),
        });
      });
      return primaryKeys;
    } catch (error) {
      throw new Error(`Failed to get table primary columns: ${error.message}`);
    }
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    try {
      const client = await this.getCassandraClient();
      const keyspace = this.connection.database;
      const tables: Array<TableDS> = [];
      const tablesResult = await client.execute(
        'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?',
        [keyspace],
        { prepare: true },
      );
      for (const row of tablesResult.rows) {
        tables.push({
          tableName: row['table_name'],
          isView: false,
        });
      }
      const viewsResult = await client.execute(
        'SELECT view_name FROM system_schema.views WHERE keyspace_name = ?',
        [keyspace],
        { prepare: true },
      );
      for (const row of viewsResult.rows) {
        tables.push({
          tableName: row['view_name'],
          isView: true,
        });
      }
      return tables;
    } catch (error) {
      throw new Error(`Failed to get tables from database: ${error.message}`);
    }
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    try {
      const client = await this.getCassandraClient();
      const tableStructure: Array<TableStructureDS> = [];
      const keyspace = this.connection.database;
      const tableNameLower = tableName.toLowerCase();
      const columnsResult = await client.execute(
        'SELECT column_name, type, kind FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?',
        [keyspace, tableNameLower],
        { prepare: true },
      );
      for (const row of columnsResult.rows) {
        tableStructure.push({
          column_name: row['column_name'],
          column_default: null,
          data_type: this.cassandraTypeToReadable(row['type']),
          allow_null: true,
          character_maximum_length: null,
          data_type_params: null,
          udt_name: null,
        });
      }
      if (tableStructure.length === 0) {
        throw new Error(`Table or view ${tableName} not found`);
      }
      return tableStructure;
    } catch (error) {
      throw new Error(`Failed to get table structure: ${error.message}`);
    }
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    try {
      const client = await this.getCassandraClient();
      await client.execute('SELECT key FROM system.local');
      return {
        result: true,
        message: 'Successfully connected',
      };
    } catch (error) {
      return {
        result: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const client = await this.getCassandraClient();
      const primaryKeys = await this.getTablePrimaryColumns(tableName);
      const setClause = [];
      const setParams = [];
      for (const [key, value] of Object.entries(row)) {
        if (!primaryKeys.some((pk) => pk.column_name === key)) {
          setClause.push(`${key} = ?`);
          setParams.push(value);
        }
      }
      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }
      const whereConditions = [];
      const whereParams = [];
      for (const key of primaryKeys) {
        const keyName = key.column_name;
        if (primaryKey[keyName] !== undefined) {
          whereConditions.push(`${keyName} = ?`);
          whereParams.push(primaryKey[keyName]);
        }
      }
      if (whereConditions.length === 0) {
        throw new Error('No primary key values provided for update');
      }
      const query = `UPDATE ${tableName} SET ${setClause.join(', ')} WHERE ${whereConditions.join(' AND ')}`;
      await client.execute(query, [...setParams, ...whereParams], { prepare: true });
      return primaryKey;
    } catch (error) {
      throw new Error(`Failed to update row in table: ${error.message}`);
    }
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      for (const primaryKey of primaryKeys) {
        await this.updateRowInTable(tableName, newValues, primaryKey);
      }
      return primaryKeys;
    } catch (error) {
      throw new Error(`Failed to bulk update rows in table: ${error.message}`);
    }
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    try {
      let deletedCount = 0;
      for (const primaryKey of primaryKeys) {
        try {
          await this.deleteRowInTable(tableName, primaryKey);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting row: ${error.message}`);
        }
      }
      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to bulk delete rows in table: ${error.message}`);
    }
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    try {
      const [tableStructure, primaryColumns] = await Promise.all([
        this.getTableStructure(tableName),
        this.getTablePrimaryColumns(tableName),
      ]);
      return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
    } catch (error) {
      throw new Error(`Failed to validate settings: ${error.message}`);
    }
  }

  public async getReferencedTableNamesAndColumns(_tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    return [];
  }

  public async isView(tableName: string): Promise<boolean> {
    try {
      const client = await this.getCassandraClient();
      const keyspace = this.connection.database;
      const result = await client.execute(
        'SELECT view_name FROM system_schema.views WHERE keyspace_name = ? AND view_name = ?',
        [keyspace, tableName.toLowerCase()],
        { prepare: true },
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to check if table is a view: ${error.message}`);
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
    try {
      const result = await this.getRowsFromTable(
        tableName,
        settings,
        page,
        perPage,
        searchedFieldValue,
        filteringFields,
        null,
      );
      const readable = new Readable({
        objectMode: true,
        read() {
          for (const row of result.data) {
            this.push(row);
          }
          this.push(null);
        },
      });
      return readable;
    } catch (error) {
      throw new Error(`Failed to get table rows stream: ${error.message}`);
    }
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    try {
      const tableStructure = await this.getTableStructure(tableName);
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      const parser = csv.parse({ columns: true, trim: true });
      const rows = [];
      await new Promise<void>((resolve, reject) => {
        bufferStream
          .pipe(parser)
          .on('data', (row) => rows.push(row))
          .on('error', (err) => reject(err))
          .on('end', () => resolve());
      });
      for (const row of rows) {
        const processedRow = {};
        for (const field of tableStructure) {
          const columnName = field.column_name;

          if (row[columnName] !== undefined) {
            let value = row[columnName];
            if (field.data_type === 'uuid' && typeof value === 'string') {
              value = value.replace(/^"+|"+$/g, '');
            } else if (
              field.data_type.includes('int') ||
              field.data_type.includes('float') ||
              field.data_type.includes('double')
            ) {
              value = isNaN(parseFloat(value)) ? null : parseFloat(value);
            } else if (field.data_type === 'timestamp' && !isNaN(Number(value))) {
              const timestamp = Number(value);
              value = new Date(timestamp);
            } else if (field.data_type.includes('boolean')) {
              value = value.toLowerCase() === 'true';
            }
            processedRow[columnName] = value;
          }
        }

        await this.addRowInTable(tableName, processedRow);
      }
    } catch (error) {
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  }

  public async executeRawQuery(query: string): Promise<Array<Record<string, unknown>>> {
    try {
      const client = await this.getCassandraClient();
      const result = await client.execute(query, [], { prepare: true });
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to execute raw query: ${error.message}`);
    }
  }

  private async getCassandraClient(): Promise<cassandra.Client> {
    const cachedClient = LRUStorage.getCassandraClientCache(this.connection);

    if (cachedClient) {
      try {
        await cachedClient.execute('SELECT key FROM system.local LIMIT 1');
        return cachedClient as cassandra.Client;
      } catch (error) {
        console.log(`Cached client connection failed: ${error.message}. Creating new connection.`);
        try {
          await cachedClient.shutdown();
        } catch (_) {
        } finally {
          LRUStorage.delCassandraClientCache(this.connection);
        }
      }
    }
    try {
      let contactPoints = [this.connection.host];
      let port = this.connection.port;
      if (this.connection.ssh) {
        if (!this.connection.sshHost || !this.connection.sshPort || !this.connection.sshUsername) {
          throw new Error('SSH connection requires host, port, and username');
        }
        const portForSSH = await getPort();
        const tunnelConnection: any = {
          host: this.connection.host,
          port: this.connection.port,
          sshHost: this.connection.sshHost,
          sshPort: this.connection.sshPort,
          sshUsername: this.connection.sshUsername,
          privateSSHKey: this.connection.privateSSHKey,
        };
        await getTunnel(tunnelConnection, portForSSH);
        contactPoints = ['127.0.0.1'];
        port = portForSSH;
      }
      const authProvider = new cassandra.auth.PlainTextAuthProvider(this.connection.username, this.connection.password);
      const clientOptions: cassandra.ClientOptions = {
        contactPoints,
        localDataCenter: this.connection.dataCenter || undefined,
        keyspace: this.connection.database,
        authProvider,
        protocolOptions: {
          port,
        },
      };
      if (this.connection.ssl) {
        clientOptions.sslOptions = {
          rejectUnauthorized: false,
        };
        if (this.connection.cert) {
          clientOptions.sslOptions.ca = [this.connection.cert];
        }
      }
      const client = new cassandra.Client(clientOptions);
      await client.connect();
      LRUStorage.setCassandraClientCache(this.connection, client);
      return client;
    } catch (error) {
      throw new Error(`Failed to create Cassandra client: ${error.message}`);
    }
  }
}
