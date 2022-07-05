import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { BasicDao } from '../shared/basic-dao';
import {
  IAutocompleteFieldsData,
  IDataAccessObject,
  IFilteringFieldsData,
  IForeignKey,
  IPrimaryKey,
  IRows,
  ITableStructure,
  ITestConnectResult,
} from '../shared/data-access-object-interface';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { Knex } from 'knex';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { Cacher } from '../../helpers/cache/cacher';
import { TunnelCreator } from '../../dal/shared/tunnel-creator';
import { getMssqlKnex } from '../shared/utils/get-mssql-knex';
import { isObjectEmpty, objectKeysToLowercase, renameObjectKeyName, tableSettingsFieldValidator } from '../../helpers';
import { Constants } from '../../helpers/constants/constants';
import { FilterCriteriaEnum, QueryOrderingEnum } from '../../enums';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class DataAccessObjectMssql extends BasicDao implements IDataAccessObject {
  private readonly connection: ConnectionEntity;

  constructor(connection: ConnectionEntity) {
    super();
    this.connection = connection;
  }

  //todo complex keys
  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const knex = await this.configureKnex();
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKeys = primaryColumns.map((column) => column.column_name);
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

  public async configureKnex(): Promise<Knex> {
    const cachedKnex = Cacher.getCachedKnex(this.connection);
    if (cachedKnex) {
      return cachedKnex;
    }
    if (this.connection.ssh) {
      const newKnex = await TunnelCreator.createTunneledKnex(this.connection);
      Cacher.setKnexCache(this.connection, newKnex);
      return newKnex;
    } else {
      return getMssqlKnex(this.connection);
    }
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
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
    const knex = await this.configureKnex();
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

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsEntity,
  ): Promise<Record<string, unknown>> {
    if (!settings) {
      const schemaName = await this.getSchemaName(tableName);
      tableName = `${schemaName}.[${tableName}]`;
      const knex = await this.configureKnex();
      return (await knex(tableName).where(primaryKey))[0] as unknown as Record<string, unknown>;
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return (await knex(tableName).select(availableFields).where(primaryKey))[0] as unknown as Record<string, unknown>;
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFieldsData>,
    autocompleteFields: IAutocompleteFieldsData,
  ): Promise<IRows> {
    if (!page || page <= 0) {
      page = Constants.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = Constants.DEFAULT_PAGINATION.perPage;
      }
    }
    const knex = await this.configureKnex();
    const [rowsCount, availableFields] = await Promise.all([
      this.getRowsCount(tableName),
      this.findAvaliableFields(settings, tableName),
    ]);

    let tableSchema = await this.getSchemaName(tableName);
    if (tableSchema) {
      tableName = `${tableSchema}.[${tableName}]`;
    }
    const lastPage = Math.ceil(rowsCount / perPage);
    /* eslint-enable */
    let rowsRO;
    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableName)
        .select(autocompleteFields.fields)
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            fields.map((field, index) => {
              builder.orWhere(field, 'like', `${value}%`);
            });
          } else {
            return;
          }
          /*eslint-enable*/
        })
        .limit(Constants.AUTOCOMPLETE_ROW_LIMIT);
      rowsRO = {
        data: rows,
        pagination: {},
      };

      return rowsRO;
    }

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
            builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
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
    };
    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string): Promise<Array<IForeignKey>> {
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
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
    const foreignKeysInLowercase = foreignKeys.map((key) => {
      return objectKeysToLowercase(key);
    });
    Cacher.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
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

    const primaryColumnsInLowercase = primaryColumns.map((column) => {
      return objectKeysToLowercase(column);
    });
    Cacher.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    const schema = await this.getSchemaNameWithoutBrackets(tableName);
    const structureColumns = await knex('information_schema.COLUMNS')
      .select('COLUMN_NAME', 'COLUMN_DEFAULT', 'DATA_TYPE', 'IS_NULLABLE', 'CHARACTER_MAXIMUM_LENGTH')
      .orderBy('ORDINAL_POSITION')
      .where({
        table_catalog: this.connection.database,
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
      [this.connection.database, tableName, schema],
    );

    generatedColumns = generatedColumns.map((column) => column.COLUMN_NAME);

    let structureColumnsInLowercase = structureColumns.map((column) => {
      return objectKeysToLowercase(column);
    });

    structureColumnsInLowercase.map((column) => {
      renameObjectKeyName(column, 'is_nullable', 'allow_null');
      column.allow_null = column.allow_null === 'YES';
      if (generatedColumns.indexOf(column.column_name) >= 0) {
        column.column_default = 'autoincrement';
      }
      return column;
    });
    Cacher.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase);
    return structureColumnsInLowercase;
  }

  public async getTablesFromDB(): Promise<Array<string>> {
    const knex = await this.configureKnex();
    const andString = this.connection.schema ? ` AND TABLE_SCHEMA = '${this.connection.schema}'` : undefined;
    let result = await knex.raw(
      `SELECT TABLE_NAME
       FROM ??.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_TYPE = 'BASE TABLE' ${andString ? andString : ''}`,
      [this.connection.database],
    );
    result = result.map((e) => {
      return e.TABLE_NAME;
    });
    return result;
  }

  public async testConnect(): Promise<ITestConnectResult> {
    const knex = await this.configureKnex();
    try {
      const result = await knex().select(1);
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

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    return knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async validateSettings(settings: CreateTableSettingsDto, tableName: string): Promise<Array<string>> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
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
    let tableSchema = undefined;
    for (const row of queryResult) {
      if (row.TableName.includes(tableName)) {
        tableSchema = row.TableName.split('.')[0];
      }
    }
    return tableSchema;
  }

  private async findAvaliableFields(settings: TableSettingsEntity, tableName: string): Promise<Array<string>> {
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

  private async getRowsCount(tableName): Promise<number> {
    const knex = await this.configureKnex();
    const countQueryResult = await knex.raw(
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
    const rowsCount = countQueryResult[0].RowCount;
    return parseInt(rowsCount);
  }

  private async getSchemaNameWithoutBrackets(tableName: string): Promise<string> {
    const schema = await this.getSchemaName(tableName);
    if (!schema) {
      throw new HttpException(
        {
          message: Messages.TABLE_SCHEMA_NOT_FOUND(tableName),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const matches = schema.match(/\[(.*?)\]/);
    return matches[1];
  }
}
