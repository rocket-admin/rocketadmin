import knex from 'knex';
import { BasicDao } from '../shared/basic-dao.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { Constants } from '../../helpers/constants/constants.js';
import { QueryOrderingEnum } from '../../enums/query-ordering.enum.js';
import { FilterCriteriaEnum } from '../../enums/filter-criteria.enum.js';
import {
  IAutocompleteFields,
  ICLIConnectionCredentials,
  IFilteringFields,
  ITableSettings,
} from '../../interfaces/interfaces.js';
import {
  IDaoInterface,
  IDaoRowsRO,
  IReferecedTableNamesAndColumns,
  ITestConnectResult,
} from '../shared/dao-interface.js';
import { renameObjectKeyName } from '../../helpers/rename-object-key-name.js';
import { tableSettingsFieldValidator } from '../../helpers/validators/table-settings-field-validator.js';
import { objectKeysToLowercase } from '../../helpers/object-keys-to-lowercase.js';
import { isObjectEmpty } from '../../helpers/is-object-empty.js';

export class DaoMssql extends BasicDao implements IDaoInterface {
  private readonly connection: ICLIConnectionCredentials;

  constructor(connection: ICLIConnectionCredentials) {
    super();
    this.connection = connection;
  }

  async addRowInTable(tableName: string, row: string): Promise<any> {
    const knex = await this.configureKnex(this.connection);
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKeys = primaryColumns.map((column) => column.column_name);
    const primaryKey = primaryColumns[0];
    tableStructure
      .map((e) => {
        return e.column_name;
      })
      .indexOf(primaryKey.column_name);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    if (primaryColumns?.length > 0) {
      const result = await knex(tableName).returning(primaryKeys).insert(row);
      const resultsArray = [];
      for (let i = 0; i < primaryKeys.length; i++) {
        resultsArray.push([primaryKeys[i], result[i]]);
      }
      return Object.fromEntries(resultsArray);
    } else {
      const rowKeys = Object.keys(row);
      const resultsArray = [];
      const result = await knex(tableName).returning(rowKeys).insert(row);
      for (let i = 0; i < rowKeys.length; i++) {
        resultsArray.push([primaryKeys[i], result[i]]);
      }
      return Object.fromEntries(resultsArray);
    }
  }

  configureKnex(connectionConfig: ICLIConnectionCredentials): any {
    return DaoMssql.configureKnex(connectionConfig);
  }

  public static configureKnex(connectionConfig: ICLIConnectionCredentials): any {
    const { host, username, password, database, port, type, ssl, cert } = connectionConfig;
    const cachedKnex = Cacher.getCachedKnex(connectionConfig);
    if (cachedKnex) {
      return cachedKnex;
    } else {
      const newKnex = knex({
        client: type,
        connection: {
          host: host,
          user: username,
          password: password,
          database: database,
          port: port,
          ssl: ssl ? { ca: cert } : { rejectUnauthorized: false },
        },
      });
      Cacher.setKnexCache(connectionConfig, newKnex);
      return newKnex;
    }
  }

  async deleteRowInTable(tableName: string, primaryKey: string): Promise<string> {
    const knex = this.configureKnex(this.connection);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  async getRowByPrimaryKey(tableName: string, primaryKey: string, settings: ITableSettings): Promise<Array<string>> {
    if (!settings || isObjectEmpty(settings)) {
      const schemaName = await this.getSchemaName(tableName);
      tableName = `${schemaName}.[${tableName}]`;
      return this.configureKnex(this.connection)(tableName).where(primaryKey);
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex(this.connection);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName).select(availableFields).where(primaryKey);
  }

  async getRowsFromTable(
    tableName: string,
    settings: ITableSettings,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFields>,
    autocompleteFields: IAutocompleteFields,
  ): Promise<IDaoRowsRO> {
    /* eslint-disable */
    if (!page || page <= 0) {
      page = Constants.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = Constants.DEFAULT_PAGINATION.perPage;
      }
    }
    const knex = await this.configureKnex(this.connection);
    //todo ask
    const countQueryResult = await knex.raw(
      `SELECT
      QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
      FROM
      sys.objects AS sOBJ
      INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
            ON sOBJ.object_id = sdmvPTNS.object_id
      WHERE
      sOBJ.type = 'U'
      AND sOBJ.is_ms_shipped = 0x0
      AND sdmvPTNS.index_id < 2
      GROUP BY
      sOBJ.schema_id
      , sOBJ.name
      ORDER BY [TableName]`,
    );
    const availableFields = await this.findAvaliableFields(settings, tableName);
    let rowsCount = 0;
    let tableSchema = await this.getSchemaName(tableName);
    if (tableSchema) {
      tableName = `${tableSchema}.[${tableName}]`;
    }

    for (const row of countQueryResult) {
      if (row.TableName.includes(tableName)) {
        rowsCount = row['RowCount'];
      }
    }

    const lastPage = Math.ceil(rowsCount / perPage);
    /* eslint-enable */
    let rowsRO;
    if (
      autocompleteFields &&
      !isObjectEmpty(autocompleteFields) &&
      autocompleteFields.value &&
      autocompleteFields.fields.length > 0
    ) {
      const rows = await knex(tableName)
        .select(autocompleteFields.fields)
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            for (const field of fields) {
              builder.orWhere(field, 'like', `${value}%`);
            }
          } else {
            return;
          }
          /*eslint-enable*/
        })
        .limit(Constants.AUTOCOMPLETE_ROW_LIMIT);
      rowsRO = {
        data: rows,
        pagination: {},
        large_dataset: rowsCount >= Constants.LARGE_DATASET_SIZE,
      };

      return rowsRO;
    }
    // for realisation pagination in mssql we need sorting in query. OFFSET and FETCH doesn't work
    // without order. Correct query example:
    // SELECT * FROM test_schema.Persons
    // ORDER BY ID
    // OFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY
    if (!settings?.ordering_field) {
      settings.ordering_field = availableFields[0];
      settings.ordering = QueryOrderingEnum.ASC;
    }
    const rows = await knex(tableName)
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        const { search_fields } = settings;
        if (search_fields && searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
            }
          }
        }
        /*eslint-enable*/
      })
      .modify((builder) => {
        if (filteringFields && filteringFields.length > 0) {
          for (const filterObject of filteringFields) {
            const { field, criteria, value } = filterObject;
            switch (criteria) {
              case FilterCriteriaEnum.eq:
                builder.andWhere(field, '=', `${value}`);
                break;
              case FilterCriteriaEnum.startswith:
                builder.andWhere(field, 'like', `${value}%`);
                break;
              case FilterCriteriaEnum.endswith:
                builder.andWhere(field, 'like', `%${value}`);
                break;
              case FilterCriteriaEnum.gt:
                builder.andWhere(field, '>', value);
                break;
              case FilterCriteriaEnum.lt:
                builder.andWhere(field, '<', value);
                break;
              case FilterCriteriaEnum.lte:
                builder.andWhere(field, '<=', value);
                break;
              case FilterCriteriaEnum.gte:
                builder.andWhere(field, '>=', value);
                break;
              case FilterCriteriaEnum.contains:
                builder.andWhere(field, 'like', `%${value}%`);
                break;
              case FilterCriteriaEnum.icontains:
                builder.andWhereNot(field, 'like', `%${value}%`);
                break;
              case FilterCriteriaEnum.empty:
                builder.orWhereNull(field);
                builder.orWhere(field, '=', `''`);
                break;
            }
          }
        }
      })
      .orderBy(settings.ordering_field, settings.ordering)
      .paginate({
        perPage: perPage,
        currentPage: page,
        isLengthAware: true,
      });
    const { data } = rows;
    const receivedPagination = rows.pagination;
    const pagination = {
      total: receivedPagination.total ? receivedPagination.total : rowsCount,
      lastPage: receivedPagination.lastPage ? receivedPagination.lastPage : lastPage,
      perPage: receivedPagination.perPage,
      currentPage: receivedPagination.currentPage,
    };
    rowsRO = {
      data,
      pagination,
      large_dataset: rowsCount >= Constants.LARGE_DATASET_SIZE,
    };
    return rowsRO;
  }

  async getTableForeignKeys(tableName: string): Promise<Array<string>> {
    const knex = await this.configureKnex(this.connection);
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const foreignKeys = await knex.raw(
      `SELECT
    ccu.constraint_name AS constraint_name
    ,ccu.column_name AS column_name
    ,kcu.table_name AS referenced_table_name
    ,kcu.column_name AS referenced_column_name
    FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
    INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
    WHERE ccu.TABLE_NAME = ? AND ccu.TABLE_SCHEMA = ?`,
      [tableName, schema],
    );
    const foreignKeysInLowercase = [];
    for (const foreignKey of foreignKeys) {
      foreignKeysInLowercase.push(objectKeysToLowercase(foreignKey));
    }
    return foreignKeysInLowercase;
  }

  async getTablePrimaryColumns(tableName: string): Promise<any> {
    const knex = await this.configureKnex(this.connection);
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const primaryColumns = await knex.raw(
      `Select C.COLUMN_NAME
     , C.DATA_TYPE
      From INFORMATION_SCHEMA.COLUMNS As C
         Outer Apply (
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

    const primaryColumnsInLowercase = [];

    for (const primaryColumn of primaryColumns) {
      primaryColumnsInLowercase.push(objectKeysToLowercase(primaryColumn));
    }
    return primaryColumnsInLowercase;
  }

  async getTableStructure(tableName: string): Promise<any> {
    const knex = this.configureKnex(this.connection);
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const structureColumns = await knex('information_schema.COLUMNS')
      .select('COLUMN_NAME', 'COLUMN_DEFAULT', 'DATA_TYPE', 'IS_NULLABLE', 'CHARACTER_MAXIMUM_LENGTH')
      .where({
        table_catalog: this.connection.database,
        table_name: tableName,
        table_schema: schema,
      });

    let generatedColumns = await knex.raw(
      `select COLUMN_NAME
       from INFORMATION_SCHEMA.COLUMNS
       where COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
       AND TABLE_CATALOG = ? AND TABLE_NAME = ? AND TABLE_SCHEMA = ?`,
      [this.connection.database, tableName, schema],
    );
    generatedColumns = generatedColumns.map((e) => e.COLUMN_NAME);

    const structureColumnsInLowercase = [];
    for (const structureColumn of structureColumns) {
      structureColumnsInLowercase.push(objectKeysToLowercase(structureColumn));
    }
    for (const element of structureColumnsInLowercase) {
      renameObjectKeyName(element, 'is_nullable', 'allow_null');
      element.allow_null = element.allow_null === 'YES';
      if (generatedColumns.indexOf(element.column_name) >= 0) {
        element.column_default = 'autoincrement';
      }
    }
    return structureColumnsInLowercase;
  }

  async getTablesFromDB(): Promise<Array<string>> {
    const knex = this.configureKnex(this.connection);
    const andString = this.connection.schema ? ` AND TABLE_SCHEMA = '${this.connection.schema}'` : undefined;
    let result = await knex.raw(
      `SELECT TABLE_NAME
      FROM ??.INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'${andString ? andString : ''}`,
      [this.connection.database],
    );
    result = result.map((e) => {
      return e.TABLE_NAME;
    });
    return result;
  }

  async testConnect(): Promise<ITestConnectResult> {
    const knex = await this.configureKnex(this.connection);
    let result;
    try {
      result = await knex().select(1);
      if (result) {
        return {
          result: true,
          message: 'Successfully connected',
        };
      }
    } catch (e) {
      return {
        result: false,
        message: e.message,
      };
    }
    return {
      result: false,
      message: 'Connection failed',
    };
  }

  async updateRowInTable(tableName: string, row, primaryKey: string): Promise<string> {
    const knex = this.configureKnex(this.connection);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  async validateSettings(settings: ITableSettings, tableName: string): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<string> {
    const knex = await this.configureKnex(this.connection);
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return await knex(tableName)
      .modify((builder) => {
        if (identityColumnName) {
          builder.select(referencedFieldName, identityColumnName);
        } else {
          builder.select(referencedFieldName);
        }
      })
      .whereIn(referencedFieldName, fieldValues);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<IReferecedTableNamesAndColumns>> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const knex = await this.configureKnex(this.connection);
    const results: Array<IReferecedTableNamesAndColumns> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
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
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: result[0],
      });
    }
    return results;
  }

  private async findAvaliableFields(settings: ITableSettings, tableName: string): Promise<Array<string>> {
    let availableFields = [];
    if (isObjectEmpty(settings)) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
      return availableFields;
    }
    const excludedFields = settings.excluded_fields;
    if (settings.list_fields && settings.list_fields.length > 0) {
      availableFields = settings.list_fields;
    } else {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
    }
    if (excludedFields && excludedFields.length > 0) {
      for (const field of excludedFields) {
        const delIndex = availableFields.indexOf(field);
        if (delIndex >= 0) {
          availableFields.splice(availableFields.indexOf(field), 1);
        }
      }
    }
    return availableFields;
  }

  private async getSchemaName(tableName: string): Promise<string> {
    if (this.connection.schema) {
      return `[${this.connection.schema}]`;
    }
    const knex = this.configureKnex(this.connection);
    const queryResult = await knex.raw(`SELECT
      QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
      FROM
      sys.objects AS sOBJ
      INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
            ON sOBJ.object_id = sdmvPTNS.object_id
      WHERE
      sOBJ.type = 'U'
      AND sOBJ.is_ms_shipped = 0x0
      AND sdmvPTNS.index_id < 2
      GROUP BY
      sOBJ.schema_id
      , sOBJ.name
      ORDER BY [TableName]`);
    let tableSchema = undefined;
    for (const row of queryResult) {
      if (row.TableName.includes(tableName)) {
        tableSchema = row.TableName.split('.')[0];
      }
    }
    return tableSchema;
  }

  private async getSchemaNameWithoutBrackets(tableName: string): Promise<string> {
    const schema = await this.getSchemaName(tableName);
    const matches = schema.match(/\[(.*?)\]/);
    return matches[1];
  }
}
