import { Knex } from 'knex';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { objectKeysToLowercase } from '../../helpers/object-kyes-to-lowercase.js';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
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
import { Stream, Readable } from 'node:stream';
import * as csv from 'csv';

export class DataAccessObjectMssql extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const knex = await this.configureKnex();
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKeys = primaryColumns.map(({ column_name }) => column_name);
    const schemaName = await this.getSchemaName(tableName);

    const keysToReturn = primaryColumns?.length > 0 ? primaryKeys : Object.keys(row);
    const result = await knex(`${schemaName}.[${tableName}]`).returning(keysToReturn).insert(row);

    return result[0];
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    const columnsToSelect = identityColumnName ? [referencedFieldName, identityColumnName] : [referencedFieldName];
    return knex(tableName).select(columnsToSelect).whereIn(referencedFieldName, fieldValues);
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    tableSettings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;

    let fieldsToSelect: string | Array<string> = '*';
    if (tableSettings) {
      const tableStructure = await this.getTableStructure(tableName);
      fieldsToSelect = this.findAvailableFields(tableSettings, tableStructure);
    }

    return (await knex(tableName).select(fieldsToSelect).where(primaryKey))[0] as unknown as Record<string, unknown>;
  }

  public async getRowsFromTable(
    receivedTableName: string,
    tableSettings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : tableSettings.list_per_page > 0
          ? tableSettings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const knex = await this.configureKnex();
    const [tableStructure, tableSchema] = await Promise.all([
      this.getTableStructure(receivedTableName),
      this.getSchemaName(receivedTableName),
    ]);

    const availableFields = this.findAvailableFields(tableSettings, tableStructure);
    const tableNameWithoutSchema = receivedTableName;
    const tableNameWithSchema = tableSchema ? `${tableSchema}.[${receivedTableName}]` : receivedTableName;

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableNameWithSchema)
        .select(autocompleteFields.fields)
        .modify((builder) => {
          if (autocompleteFields.value !== '*') {
            autocompleteFields.fields.forEach((field) => {
              builder.orWhere(field, 'like', `${autocompleteFields.value}%`);
            });
          }
        })
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);

      const rowsCount = await this.getRowsCount(tableNameWithoutSchema, null);

      return {
        data: rows,
        pagination: {} as any,
        large_dataset: rowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
      };
    }

    tableSettings.ordering_field = tableSettings?.ordering_field || availableFields[0];
    tableSettings.ordering = tableSettings?.ordering || QueryOrderingEnum.ASC;

    const rowsCountQuery = knex(tableNameWithSchema)
      .modify((builder) => {
        let search_fields = tableSettings?.search_fields || [];

        if (search_fields.length === 0 && searchedFieldValue) {
          search_fields = availableFields;
        }

        if (searchedFieldValue) {
          search_fields.forEach((field) => {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(`LOWER(CAST(?? AS CHAR(255))) LIKE ?`, [
                field,
                `${searchedFieldValue.toLowerCase()}%`,
              ]);
            }
          });
        }
      })
      .modify((builder) => {
        if (filteringFields?.length > 0) {
          for (const { field, criteria, value } of filteringFields) {
            const operators = {
              [FilterCriteriaEnum.eq]: '=',
              [FilterCriteriaEnum.startswith]: 'like',
              [FilterCriteriaEnum.endswith]: 'like',
              [FilterCriteriaEnum.gt]: '>',
              [FilterCriteriaEnum.lt]: '<',
              [FilterCriteriaEnum.lte]: '<=',
              [FilterCriteriaEnum.gte]: '>=',
              [FilterCriteriaEnum.contains]: 'like',
              [FilterCriteriaEnum.icontains]: 'not like',
              [FilterCriteriaEnum.empty]: 'is',
            };

            const values = {
              [FilterCriteriaEnum.startswith]: `${value}%`,
              [FilterCriteriaEnum.endswith]: `%${value}`,
              [FilterCriteriaEnum.contains]: `%${value}%`,
              [FilterCriteriaEnum.icontains]: `%${value}%`,
              [FilterCriteriaEnum.empty]: null,
            };
            builder.where(field, operators[criteria], values[criteria] || value);
          }
        }
      });

    const rowsDataQuery = rowsCountQuery.clone();

    const rowsCount = await this.getRowsCount(tableNameWithoutSchema, rowsCountQuery);

    const { ordering_field, ordering } = tableSettings;
    const rows = await rowsDataQuery
      .select(availableFields)
      .orderBy(ordering_field, ordering)
      .limit(perPage)
      .offset((page - 1) * perPage);

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
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const foreignKeys = await knex.raw(
      `SELECT ccu.constraint_name AS constraint_name
            , ccu.column_name     AS column_name
            , kcu.table_name      AS referenced_table_name
            , kcu.column_name     AS referenced_column_name
       FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                           ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                           ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
       WHERE ccu.TABLE_NAME = ?
         AND ccu.TABLE_SCHEMA = ?`,
      [tableName, schema],
    );

    const foreignKeysInLowercase: ForeignKeyDS[] = foreignKeys.map(objectKeysToLowercase);

    LRUStorage.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const primaryColumns = await knex.raw(
      `Select C.COLUMN_NAME
            , C.DATA_TYPE
       From INFORMATION_SCHEMA.COLUMNS As C Outer Apply (
      Select CCU.CONSTRAINT_NAME
      From INFORMATION_SCHEMA.TABLE_CONSTRAINTS As TC
             Join INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE As CCU
                  On CCU.CONSTRAINT_NAME = TC.CONSTRAINT_NAME
      Where TC.TABLE_SCHEMA = C.TABLE_SCHEMA
      And TC.TABLE_NAME = C.TABLE_NAME
      And TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
                    And CCU.COLUMN_NAME = C.COLUMN_NAME
      ) As Z
       Where C.TABLE_NAME = ? AND Z.CONSTRAINT_NAME is not null AND C.TABLE_SCHEMA = ?;`,
      [tableName, schema],
    );

    const primaryColumnsInLowercase: PrimaryKeyDS[] = primaryColumns.map(objectKeysToLowercase);
    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const knex = await this.configureKnex();
    const query = `
    SELECT TABLE_NAME,
       CASE
           WHEN TABLE_TYPE = 'BASE TABLE' THEN 0
           ELSE 1
           END AS isView
FROM ??.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
UNION
SELECT TABLE_NAME,
       CASE
           WHEN TABLE_TYPE = 'BASE TABLE' THEN 0
           ELSE 1
           END AS isView
FROM ??.INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'VIEW'
    `;
    let result = await knex.raw(query, [this.connection.database, this.connection.database]);

    return result.map(({ TABLE_NAME, isView }: { TABLE_NAME: string; isView: number }) => ({
      tableName: TABLE_NAME,
      isView: isView === 1,
    }));
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const { database } = this.connection;
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const structureColumns = await knex('information_schema.COLUMNS')
      .select('COLUMN_NAME', 'COLUMN_DEFAULT', 'DATA_TYPE', 'IS_NULLABLE', 'CHARACTER_MAXIMUM_LENGTH')
      .orderBy('ORDINAL_POSITION')
      .where({
        table_catalog: database,
        table_name: tableName,
        table_schema: schema,
      });

    let generatedColumns = await knex.raw(
      `select COLUMN_NAME
         from INFORMATION_SCHEMA.COLUMNS
         where COLUMNPROPERTY(object_id(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
           AND TABLE_CATALOG = ?
           AND TABLE_NAME = ?
           AND TABLE_SCHEMA = ?`,
      [database, tableName, schema],
    );

    generatedColumns = generatedColumns.map((column) => column.COLUMN_NAME);

    const structureColumnsInLowercase = structureColumns.map(objectKeysToLowercase);

    structureColumnsInLowercase.map((column) => {
      renameObjectKeyName(column, 'is_nullable', 'allow_null');
      column.allow_null = column.allow_null === 'YES';
      if (generatedColumns.indexOf(column.column_name) >= 0) {
        column.column_default = 'autoincrement';
      }
      return column;
    });
    LRUStorage.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase as TableStructureDS[]);
    return structureColumnsInLowercase as TableStructureDS[];
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const knex = await this.configureKnex();
    try {
      await knex().select(1);
      return {
        result: true,
        message: 'Successfully connected',
      };
    } catch (e) {
      return {
        result: false,
        message: e.message || 'Connection failed',
      };
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const [knex, schemaName] = await Promise.all([this.configureKnex(), this.getSchemaName(tableName)]);
    const tableWithSchema = `${schemaName}.[${tableName}]`;
    return knex(tableWithSchema).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    const [knex, schemaName] = await Promise.all([this.configureKnex(), this.getSchemaName(tableName)]);
    const tableWithSchema = `${schemaName}.[${tableName}]`;
    const primaryKeysNames = Object.keys(primaryKeys[0]);
    const primaryKeysValues = primaryKeys.map(Object.values);

    return knex(tableWithSchema)
      .returning(primaryKeysNames)
      .whereIn(primaryKeysNames, primaryKeysValues)
      .update(newValues);
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
    const knex = await this.configureKnex();

    const queries = primaryColumns.map((primaryColumn) =>
      knex
        .raw(
          `
  SELECT 
    OBJECT_NAME(f.parent_object_id) "table_name",
    COL_NAME(fc.parent_object_id,fc.parent_column_id) "column_name"
  FROM 
     sys.foreign_keys AS f
  INNER JOIN 
    sys.foreign_key_columns AS fc 
      ON f.OBJECT_ID = fc.constraint_object_id
  INNER JOIN 
    sys.tables t 
     ON t.OBJECT_ID = fc.referenced_object_id
  WHERE 
     OBJECT_NAME (f.referenced_object_id) = ?
        `,
          tableName,
        )
        .then((result) => {
          let resultValue = result[0] || [];
          resultValue = Array.isArray(resultValue) ? resultValue : [resultValue];
          return {
            referenced_on_column_name: primaryColumn.column_name,
            referenced_by: resultValue,
          };
        }),
    );

    return Promise.all(queries);
  }

  public async isView(tableName: string): Promise<boolean> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaNameWithoutBrackets(tableName);
    const result = await knex('information_schema.tables')
      .select('TABLE_TYPE')
      .where('TABLE_SCHEMA', schemaName)
      .andWhere('TABLE_NAME', tableName);

    if (result.length === 0) {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
    }
    return result[0].TABLE_TYPE === 'VIEW';
  }

  public async getTableRowsStream(
    tableName: string,
    tableSettings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<unknown>> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : tableSettings.list_per_page > 0
          ? tableSettings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const knex = await this.configureKnex();
    const [rowsCount, tableStructure, tableSchema] = await Promise.all([
      this.getRowsCount(tableName, null),
      this.getTableStructure(tableName),
      this.getSchemaName(tableName),
    ]);

    const availableFields = this.findAvailableFields(tableSettings, tableStructure);

    if (rowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
      throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    }

    if (tableSchema) {
      tableName = `${tableSchema}.[${tableName}]`;
    }

    tableSettings.ordering_field = tableSettings?.ordering_field || availableFields[0];
    tableSettings.ordering = tableSettings?.ordering || QueryOrderingEnum.ASC;

    const { ordering_field, ordering } = tableSettings;
    const offset = (page - 1) * perPage;

    const rowsAsStream = knex(tableName)
      .modify((builder) => {
        let search_fields = tableSettings?.search_fields || [];

        if (search_fields.length === 0 && searchedFieldValue) {
          search_fields = availableFields;
        }

        if (searchedFieldValue) {
          search_fields.forEach((field) => {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(`LOWER(CAST(?? AS CHAR(255))) LIKE ?`, [
                field,
                `${searchedFieldValue.toLowerCase()}%`,
              ]);
            }
          });
        }
      })
      .modify((builder) => {
        if (filteringFields?.length > 0) {
          for (const { field, criteria, value } of filteringFields) {
            const operators = {
              [FilterCriteriaEnum.eq]: '=',
              [FilterCriteriaEnum.startswith]: 'like',
              [FilterCriteriaEnum.endswith]: 'like',
              [FilterCriteriaEnum.gt]: '>',
              [FilterCriteriaEnum.lt]: '<',
              [FilterCriteriaEnum.lte]: '<=',
              [FilterCriteriaEnum.gte]: '>=',
              [FilterCriteriaEnum.contains]: 'like',
              [FilterCriteriaEnum.icontains]: 'not like',
              [FilterCriteriaEnum.empty]: 'is',
            };

            const values = {
              [FilterCriteriaEnum.startswith]: `${value}%`,
              [FilterCriteriaEnum.endswith]: `%${value}`,
              [FilterCriteriaEnum.contains]: `%${value}%`,
              [FilterCriteriaEnum.icontains]: `%${value}%`,
              [FilterCriteriaEnum.empty]: null,
            };
            builder.where(field, operators[criteria], values[criteria] || value);
          }
        }
      })
      .orderBy(ordering_field, ordering)
      .limit(perPage)
      .offset(offset)
      .stream();
    return rowsAsStream;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const [knex, schemaName] = await Promise.all([this.configureKnex(), this.getSchemaName(tableName)]);
    const tableWithSchema = `${schemaName}.[${tableName}]`;
    const structure = await this.getTableStructure(tableName);
    const timestampColumnNames = structure
      .filter(({ data_type }) => this.isMSSQLDateOrTimeType(data_type))
      .map(({ column_name }) => column_name);
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);

    const parser = stream.pipe(csv.parse({ columns: true }));

    const results: any[] = [];
    for await (const record of parser) {
      results.push(record);
    }

    try {
      await knex.transaction(async (trx) => {
        for (let row of results) {
          for (let column of timestampColumnNames) {
            if (row[column] && !this.isMSSQLDateOrTimeType(row[column])) {
              const date = new Date(Number(row[column]));
              row[column] = date.toISOString();
            }
          }

          await trx(tableWithSchema).insert(row);
        }
      });
    } catch (error) {
      throw error;
    }
  }

  private async getSchemaName(tableName: string): Promise<string> {
    if (this.connection.schema) {
      return `[${this.connection.schema}]`;
    }
    const knex = await this.configureKnex();
    const queryResult =
      await knex.raw(`SELECT QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
                      FROM
                          sys.objects AS sOBJ
                          INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
                      ON sOBJ.object_id = sdmvPTNS.object_id
                      WHERE
                          sOBJ.type = 'U'
                        AND sOBJ.is_ms_shipped = 0x0
                        AND sdmvPTNS.index_id
                          < 2
                      GROUP BY
                          sOBJ.schema_id
                              , sOBJ.name
                      ORDER BY [TableName]`);

    const row = queryResult.find((row: any) => row.TableName.includes(tableName));
    return row ? row.TableName.split('.')[0] : undefined;
  }

  private async getRowsCount(tableName: string, countRowsQB: Knex.QueryBuilder<any, any[]> | null): Promise<number> {
    if (countRowsQB) {
      const slowRowsCount = await this.getRowsCountByQueryWithTimeOut(countRowsQB);
      if (slowRowsCount) {
        return slowRowsCount;
      }
      return await this.getFastRowsCount(tableName);
    }

    const fastRowsCount = await this.getFastRowsCount(tableName);
    if (fastRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
      return fastRowsCount;
    }

    const knex = await this.configureKnex();
    const countRows = knex(tableName).count('*');
    const slowRowsCount = await this.getRowsCountByQuery(countRows);
    return slowRowsCount || fastRowsCount;
  }

  private async getSchemaNameWithoutBrackets(tableName: string): Promise<string> {
    const schema = await this.getSchemaName(tableName);
    if (!schema) {
      throw new Error(ERROR_MESSAGES.TABLE_SCHEMA_NOT_FOUND(tableName));
    }
    const matches = schema.match(/\[(.*?)\]/);
    return matches[1];
  }

  private async getRowsCountByQueryWithTimeOut(countRowsQB: Knex.QueryBuilder<any, any[]>): Promise<number | null> {
    return new Promise(async (resolve) => {
      setTimeout(() => {
        resolve(null);
      }, DAO_CONSTANTS.COUNT_QUERY_TIMEOUT_MS);

      try {
        const slowRowsCountQueryResult = await countRowsQB.count('*');
        const slowRowsCount = Object.values(slowRowsCountQueryResult[0])[0];
        resolve(slowRowsCount as number);
      } catch (e) {
        resolve(null);
      }
    });
  }

  private async getRowsCountByQuery(countRowsQB: Knex.QueryBuilder<any, any[]>): Promise<number | null> {
    try {
      const slowRowsCountQueryResult = await countRowsQB.count('*');
      const slowRowsCount = Object.values(slowRowsCountQueryResult[0])[0];
      return slowRowsCount as number;
    } catch (error) {
      return null;
    }
  }

  private async getFastRowsCount(tableName: string): Promise<number> {
    const knex = await this.configureKnex();
    const fastCountQueryResult = await knex.raw(
      `SELECT QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
       FROM
           sys.objects AS sOBJ
           INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
       ON sOBJ.object_id = sdmvPTNS.object_id
       WHERE
           sOBJ.type = 'U'
         AND sOBJ.is_ms_shipped = 0x0
         AND sdmvPTNS.index_id
           < 2
         AND sOBJ.name = ?
       GROUP BY
           sOBJ.schema_id
               , sOBJ.name
       ORDER BY [TableName]`,
      [tableName],
    );
    return parseInt(fastCountQueryResult[0].RowCount);
  }

  private isMSSQLDateOrTimeType(dataType: string): boolean {
    return ['date', 'datetime', 'datetime2', 'datetimeoffset', 'smalldatetime', 'time'].includes(dataType);
  }
}
