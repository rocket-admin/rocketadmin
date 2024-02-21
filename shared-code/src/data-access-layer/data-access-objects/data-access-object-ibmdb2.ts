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
import { Database, Pool } from 'ibm_db';
import { LRUStorage } from '../../caching/lru-storage.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import getPort from 'get-port';
import { getTunnel } from '../../helpers/get-ssh-tunnel.js';

export class DataAccessObjectIbmDb2 extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(row)]);
    const connectionToDb = await this.getConnectionToDatabase();
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);

    const jsonColumnNames = tableStructure
      .filter((structEl) => structEl.data_type.toLowerCase() === 'json')
      .map((structEl) => structEl.column_name);

    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        row[key] = JSON.stringify(row[key]);
      }
    }

    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row)
      .map(() => '?')
      .join(', ');
    const values = Object.values(row);
    const query = `
    INSERT INTO ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()} (${columns})
    VALUES (${placeholders})
  `;
    await connectionToDb.query(query, values);

    if (primaryColumns?.length > 0) {
      const primaryKey = primaryColumns.map((column) => column.column_name);
      const selectQuery = `
      SELECT ${primaryKey.join(', ')}
      FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      WHERE ${Object.keys(row)
        .map((key) => `${key} = ?`)
        .join(' AND ')}
    `;
      const result = await connectionToDb.query(selectQuery, Object.values(row));
      return result[0];
    }
    return row;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(primaryKey)]);
    const connectionToDb = await this.getConnectionToDatabase();
    const whereClause = Object.keys(primaryKey)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    const query = `
    DELETE FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
    WHERE ${whereClause}
  `;
    const params = Object.values(primaryKey);
    await connectionToDb.query(query, params);
    return primaryKey;
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<string[]> {
    const schemaName = this.connection.schema.toUpperCase();
    this.validateNamesAndThrowError([tableName, referencedFieldName, identityColumnName, schemaName]);
    const connectionToDb = await this.getConnectionToDatabase();
    const columnsToSelect = identityColumnName ? `${referencedFieldName}, ${identityColumnName}` : referencedFieldName;
    const placeholders = fieldValues.map(() => '?').join(',');
    const query = `
      SELECT ${columnsToSelect} 
      FROM ${schemaName}.${tableName.toUpperCase()}
      WHERE ${referencedFieldName} IN (${placeholders})
    `;
    const result = connectionToDb.query(query, [...fieldValues]);
    return result;
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(primaryKey)]);
    const connectionToDb = await this.getConnectionToDatabase();
    const whereClause = Object.keys(primaryKey)
      .map((key) => `${key} = ?`)
      .join(' AND ');
    let selectFields = '*';
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      const availableFields = this.findAvaliableFields(settings, tableStructure);
      selectFields = availableFields.join(', ');
    }
    const query = `
    SELECT ${selectFields} 
    FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
    WHERE ${whereClause}
  `;
    const params = Object.values(primaryKey);
    const result = await connectionToDb.query(query, params);
    return result[0];
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS> {
    const connectionSchema = this.connection.schema.toUpperCase();
    tableName = tableName.toUpperCase();
    this.validateNamesAndThrowError([tableName, connectionSchema]);

    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }
    const connectionToDb = await this.getConnectionToDatabase();

    const { large_dataset, rowsCount } = await this.getRowsCount(tableName, this.connection.schema);
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvaliableFields(settings, tableStructure);

    const lastPage = Math.ceil(rowsCount / perPage);
    let rowsRO: FoundRowsDS;

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const fields = autocompleteFields.fields.join(', ');
      const autocompleteQuery = `SELECT ${fields} FROM ${connectionSchema}.${tableName} WHERE ${fields} LIKE '${autocompleteFields.value}%' FETCH FIRST ${DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT} ROWS ONLY`;
      const rows = await connectionToDb.query(autocompleteQuery);

      rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset: large_dataset,
      };
      return rowsRO;
    }

    let searchQuery = '';
    if (searchedFieldValue) {
      const searchFields = settings.search_fields?.length > 0 ? settings.search_fields : availableFields;
      const searchConditions = searchFields
        .map((field) => `LOWER(CAST(${field} AS VARCHAR(255))) LIKE '${searchedFieldValue.toLowerCase()}%'`)
        .join(' OR ');
      searchQuery = ` WHERE (${searchConditions})`;
    }

    let filterQuery = '';
    if (filteringFields && filteringFields.length > 0) {
      const filterConditions = filteringFields
        .map((filterObject) => {
          switch (filterObject.criteria) {
            case FilterCriteriaEnum.eq:
              return `${filterObject.field} = '${filterObject.value}'`;
            case FilterCriteriaEnum.startswith:
              return `${filterObject.field} LIKE '${filterObject.value}%'`;
            case FilterCriteriaEnum.endswith:
              return `${filterObject.field} LIKE '%${filterObject.value}'`;
            case FilterCriteriaEnum.gt:
              return `${filterObject.field} > ${filterObject.value}`;
            case FilterCriteriaEnum.lt:
              return `${filterObject.field} < ${filterObject.value}`;
            case FilterCriteriaEnum.lte:
              return `${filterObject.field} <= ${filterObject.value}`;
            case FilterCriteriaEnum.gte:
              return `${filterObject.field} >= ${filterObject.value}`;
            case FilterCriteriaEnum.contains:
              return `${filterObject.field} LIKE '%${filterObject.value}%'`;
            case FilterCriteriaEnum.icontains:
              return `${filterObject.field} NOT LIKE '%${filterObject.value}%'`;
            case FilterCriteriaEnum.empty:
              return `(${filterObject.field} IS NULL OR ${filterObject.field} = '')`;
          }
        })
        .join(' AND ');
      filterQuery = ` AND (${filterConditions})`;
    }

    const orderQuery =
      settings.ordering_field && settings.ordering ? ` ORDER BY ${settings.ordering_field} ${settings.ordering}` : '';
    const paginationQuery = ` OFFSET ${(page - 1) * perPage} ROWS FETCH NEXT ${perPage} ROWS ONLY`;

    const rowsQuery = `SELECT ${availableFields.join(
      ',',
    )} FROM  ${connectionSchema}.${tableName}${searchQuery}${filterQuery}${orderQuery}${paginationQuery}`;

    const rows = await connectionToDb.query(rowsQuery);

    rowsRO = {
      data: rows,
      pagination: {
        total: rowsCount,
        lastPage: lastPage,
        perPage: perPage,
        currentPage: page,
      } as any,
      large_dataset: large_dataset,
    };
    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT
    ref.constname AS constraint_name,
    col.colname AS column_name,
    pk.tabname AS referenced_table_name,
    pk.colname AS referenced_column_name
FROM
    syscat.references ref
        JOIN
    syscat.keycoluse col
    ON
        ref.constname = col.constname AND
        ref.tabschema = col.tabschema
        JOIN
    syscat.keycoluse pk
    ON
        ref.refkeyname = pk.constname AND
        ref.reftabschema = pk.tabschema
WHERE
    ref.tabname = ? AND
    ref.tabschema = ?
  `;
    const foreignKeys = await connectionToDb.query(query, [
      tableName.toUpperCase(),
      this.connection.schema.toUpperCase(),
    ]);

    const resultKeys = foreignKeys.map((foreignKey: any) => {
      return {
        column_name: foreignKey.COLUMN_NAME,
        constraint_name: foreignKey.CONSTRAINT_NAME,
        referenced_table_name: foreignKey.REFERENCED_TABLE_NAME,
        referenced_column_name: foreignKey.REFERENCED_COLUMN_NAME,
      };
    });
    LRUStorage.setTableForeignKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT colname AS column_name, typename AS data_type
    FROM syscat.columns
    WHERE tabname = ?
      AND tabschema = ?
      AND keyseq IS NOT NULL
  `;
    const primaryKeys = await connectionToDb.query(query, [
      tableName.toUpperCase(),
      this.connection.schema.toUpperCase(),
    ]);

    const resultKeys = primaryKeys.map((primaryKey: any) => {
      return {
        column_name: primaryKey.COLUMN_NAME,
        data_type: primaryKey.DATA_TYPE as string,
      };
    });
    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT tabname AS table_name, type AS table_type
    FROM syscat.tables
    WHERE tabschema = ?
    AND type IN ('T', 'V')
  `;
    const tables = await connectionToDb.query(query, [this.connection.schema.toUpperCase()]);

    return tables.map((table: any) => {
      return {
        tableName: table.TABLE_NAME,
        isView: table.TABLE_TYPE === 'V',
      };
    });
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT colname AS column_name,
    typename AS data_type,
    length AS character_maximum_length,
    scale AS numeric_scale,
    keyseq AS ordinal_position,
    nulls AS is_nullable,
    default AS column_default
    FROM syscat.columns
    WHERE tabname = ?
    AND tabschema = ?
    `;
    const tableStructure = await connectionToDb.query(query, [
      tableName.toUpperCase(),
      this.connection.schema.toUpperCase(),
    ]);

    return tableStructure.map((column: any) => {
      return {
        allow_null: column.IS_NULLABLE === 'Y',
        column_default: column.COLUMN_DEFAULT,
        column_name: column.COLUMN_NAME,
        data_type: column.DATA_TYPE,
        character_maximum_length: column.CHARACTER_MAXIMUM_LENGTH,
        data_type_params: null,
        udt_name: null,
        extra: null,
      };
    });
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT 1 FROM sysibm.sysdummy1 
  `;
    try {
      const testResult = await connectionToDb.query(query);
      if (testResult && testResult[0] && testResult[0]['1'] === 1) {
        return {
          result: true,
          message: 'Successfully connected',
        };
      }
    } catch (error) {
      return {
        result: false,
        message: error.message,
      };
    }
    return {
      result: false,
      message: 'Unknown error',
    };
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.validateNamesAndThrowError([
      tableName,
      this.connection.schema,
      ...Object.keys(row),
      ...Object.keys(primaryKey),
    ]);
    const connectionToDb = await this.getConnectionToDatabase();

    const setClause = Object.keys(row)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(primaryKey)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const query = `
      UPDATE ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      SET ${setClause}
      WHERE ${whereClause}
    `;
    const params = [...Object.values(row), ...Object.values(primaryKey)];
    await connectionToDb.query(query, params);

    const selectQuery = `
      SELECT *
      FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      WHERE ${whereClause}
    `;
    const result = await connectionToDb.query(selectQuery, Object.values(primaryKey));
    return result[0];
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    await Promise.allSettled(primaryKeys.map((key) => this.updateRowInTable(tableName, newValues, key)));
    return newValues;
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<string[]> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<ReferencedTableNamesAndColumnsDS[]> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const connectionToDb = await this.getConnectionToDatabase();
    const results: Array<ReferencedTableNamesAndColumnsDS> = [];
    for (const primaryColumn of primaryColumns) {
      const query = `
      SELECT 
      ref.tabname AS referencing_table_name, 
      col.colname AS referencing_column_name
    FROM 
      syscat.references ref
    JOIN 
      syscat.keycoluse col 
    ON 
      ref.constname = col.constname AND 
      ref.tabschema = col.tabschema
    WHERE 
      ref.reftabname = ? AND 
      ref.reftabschema = ? AND 
      ref.refkeyname IN (
        SELECT constname 
        FROM syscat.keycoluse 
        WHERE tabschema = ? AND 
              tabname = ? AND 
              colname = ?
      )
      `;
      const foreignKeys = await connectionToDb.query(query, [
        tableName.toUpperCase(),
        this.connection.schema.toUpperCase(),
        this.connection.schema.toUpperCase(),
        tableName.toUpperCase(),
        primaryColumn.column_name.toUpperCase(),
      ]);
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: foreignKeys.map((foreignKey: any) => {
          return {
            table_name: foreignKey.REFERENCING_TABLE_NAME,
            column_name: foreignKey.REFERENCING_COLUMN_NAME,
          };
        }),
      });
    }
    return results;
  }

  public async isView(tableName: string): Promise<boolean> {
    const connectionToDb = await this.getConnectionToDatabase();
    const query = `
    SELECT TYPE AS table_type
    FROM SYSCAT.TABLES
    WHERE TABSCHEMA = ? AND TABNAME = ?
    `;
    const tableData = await connectionToDb.query(query, [
      this.connection.schema.toUpperCase(),
      tableName.toUpperCase(),
    ]);
    return tableData[0].TABLE_TYPE === 'V';
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
  ): Promise<Stream & AsyncIterable<any>> {
    const { large_dataset } = await this.getRowsCount(tableName, this.connection.schema);
    if (large_dataset) {
      throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    }
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

  public async getRowsCount(
    tableName: string,
    tableSchema: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    const connectionToDb = await this.getConnectionToDatabase();
    const fastCountQuery = `
    SELECT CARD 
    FROM SYSIBM.SYSTABLES 
    WHERE NAME = ? 
    AND CREATOR = ?
  `;
    const fastCountParams = [tableName, tableSchema];
    const fastCountQueryResult = await connectionToDb.query(fastCountQuery, fastCountParams);
    const fastCount = fastCountQueryResult[0]['CARD'];
    if (fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
      return { rowsCount: fastCount, large_dataset: true };
    }
    const countQuery = `
    SELECT COUNT(*) 
    FROM ${tableSchema}.${tableName}
  `;
    const countResult = await connectionToDb.query(countQuery);
    const rowsCount = parseInt(countResult[0]['1']);
    return { rowsCount: rowsCount, large_dataset: false };
  }

  private async getConnectionToDatabase(): Promise<Database> {
    if (this.connection.ssh) {
      return this.createTunneledConnection(this.connection);
    }
    return this.getUsualConnection();
  }

  private async getUsualConnection(withCache = true): Promise<Database> {
    const cachedDatabase = LRUStorage.getImdbDb2Cache(this.connection);
    if (withCache && cachedDatabase && cachedDatabase.connected) {
      return cachedDatabase;
    }
    const connStr = `DATABASE=${this.connection.database};HOSTNAME=${this.connection.host};UID=${this.connection.username};PWD=${this.connection.password};PORT=${this.connection.port};PROTOCOL=TCPIP`;
    const connectionPool = new Pool();
    const databaseConnection = await connectionPool.open(connStr);
    LRUStorage.setImdbDb2Cache(this.connection, databaseConnection);
    return databaseConnection;
  }

  private async createTunneledConnection(connection: ConnectionParams): Promise<Database> {
    const connectionCopy = { ...connection };
    return new Promise<Database>(async (resolve, reject): Promise<Database> => {
      const cachedTnl = LRUStorage.getTunnelCache(connectionCopy);
      if (cachedTnl && cachedTnl.database && cachedTnl.server && cachedTnl.client && cachedTnl.database.connected) {
        resolve(cachedTnl.database);
        return;
      }
      const freePort = await getPort();
      try {
        const [server, client] = await getTunnel(connectionCopy, freePort);
        connection.host = '127.0.0.1';
        connection.port = freePort;
        const database = await this.getUsualConnection(false);
        const tnlCachedObj = {
          server: server,
          client: client,
          database: database,
        };
        LRUStorage.setTunnelCache(connectionCopy, tnlCachedObj);
        resolve(tnlCachedObj.database);

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

  private sanitize(value: unknown): string {
    if (typeof value === 'string') {
      return value.replace(/'/g, "''");
    } else {
      return String(value);
    }
  }
}
