/* eslint-disable security/detect-object-injection */
import { LRUStorage } from '../../caching/lru-storage.js';
import { checkFieldAutoincrement } from '../../helpers/check-field-autoincrement.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { getPropertyValueByDescriptor } from '../../helpers/get-property-value-by-descriptor.js';
import { setPropertyValue } from '../../helpers/set-property-value.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { objectKeysToLowercase } from '../../helpers/object-kyes-to-lowercase.js';
import { Knex } from 'knex';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
import { getNumbersFromString } from '../../helpers/get-numbers-from-string.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { Stream, Readable } from 'node:stream';
import * as csv from 'csv';
import { isMySqlDateOrTimeType, isMySQLDateStringByRegexp } from '../../helpers/is-database-date.js';

export class DataAccessObjectMysql extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }
  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);

    const jsonColumnNames = tableStructure.reduce((acc, structEl) => {
      if (structEl.data_type.toLowerCase() === 'json') {
        acc.add(structEl.column_name);
      }
      return acc;
    }, new Set<string>());

    for (const key in row) {
      if (jsonColumnNames.has(key)) {
        setPropertyValue(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }

    let autoIncrementPrimaryKey = null;

    for (const el of primaryColumns) {
      const primaryKeyInStructure = tableStructure.find((structureEl) => structureEl.column_name === el.column_name);

      if (
        primaryKeyInStructure &&
        checkFieldAutoincrement(primaryKeyInStructure.column_default, primaryKeyInStructure.extra)
      ) {
        autoIncrementPrimaryKey = primaryKeyInStructure;
        break;
      }
    }

    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');

    if (primaryColumns?.length > 0) {
      const primaryKeys = primaryColumns.map((column) => column.column_name);
      try {
        await knex(tableName).insert(row);
        if (!autoIncrementPrimaryKey) {
          const resultsArray = primaryKeys.map((key) => [key, row[key]]);
          return Object.fromEntries(resultsArray);
        } else {
          const lastInsertId = await knex(tableName).select(knex.raw(`LAST_INSERT_ID()`));
          const resultObj = primaryColumns.reduce((obj, el, index) => {
            obj[el.column_name] = lastInsertId[index]['LAST_INSERT_ID()'];
            return obj;
          }, {});
          return resultObj;
        }
      } catch (e) {
        throw new Error(e);
      }
    } else {
      try {
        await knex(tableName).insert(row).returning(Object.keys(row));
      } catch (error) {
        throw new Error(error);
      }
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    const columnsToSelect = identityColumnName ? [referencedFieldName, identityColumnName] : [referencedFieldName];
    return await knex(tableName).select(columnsToSelect).whereIn(referencedFieldName, fieldValues);
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    tableSettings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const knex: Knex<any, any[]> = await this.configureKnex();
    let availableFields: string[] = [];

    if (tableSettings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(tableSettings, tableStructure);
    }

    const result = await knex(tableName)
      .select(availableFields.length ? availableFields : '*')
      .where(primaryKey);

    return result[0] as unknown as Record<string, unknown>;
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
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const knex = await this.configureKnex();
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    if (autocompleteFields?.value && autocompleteFields?.fields?.length > 0) {
      const { fields, value } = autocompleteFields;

      const rows = await knex(tableName)
        .select(fields)
        .modify((builder) => {
          if (value !== '*') {
            fields.forEach((field) => {
              builder.orWhere(field, 'like', `${value}%`);
            });
          } else {
            return builder;
          }
        })
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);

      const { large_dataset } = await this.getRowsCount(knex, null, tableName, this.connection.database);

      const rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset,
      };

      return rowsRO;
    }

    const countRowsQB = knex(tableName)
      .modify((builder) => {
        let { search_fields } = settings;
        if (!search_fields?.length && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (search_fields?.length && searchedFieldValue) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST(?? AS CHAR) LIKE ?`, [field, `${searchedFieldValue.toLowerCase()}%`]);
            }
          }
        }
        return builder;
      })
      .modify((builder) => {
        if (filteringFields && filteringFields?.length) {
          for (const filterObject of filteringFields) {
            const { field, criteria, value } = filterObject;
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
        return builder;
      });

    const rowsResultQb = countRowsQB.clone();
    const offset = (page - 1) * perPage;
    const rows = await rowsResultQb
      .select(availableFields)
      .limit(perPage)
      .offset(offset)
      .modify((builder) => {
        if (settings.ordering_field && settings.ordering) {
          builder.orderBy(settings.ordering_field, settings.ordering);
        }
        return builder;
      });

    const { large_dataset, rowsCount } = await this.getRowsCount(
      knex,
      countRowsQB,
      tableName,
      this.connection.database,
    );

    const pagination = {
      total: rowsCount,
      lastPage: Math.ceil(rowsCount / perPage),
      perPage,
      currentPage: page,
    };
    const rowsRO = {
      data: rows,
      pagination,
      large_dataset,
    };

    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const { database } = this.connection;
    const knex = await this.configureKnex();
    const foreignKeys = await knex(tableName)
      .select(
        knex.raw(`COLUMN_NAME,CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME,
       REFERENCED_COLUMN_NAME`),
      )
      .from(
        knex.raw(
          `INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE
       TABLE_SCHEMA = ? AND
       TABLE_NAME  = ? AND REFERENCED_COLUMN_NAME IS NOT NULL;`,
          [database, tableName],
        ),
      );

    const foreignKeysInLowercase = foreignKeys.map(objectKeysToLowercase) as ForeignKeyDS[];

    LRUStorage.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const { database } = this.connection;

    const primaryColumns = await knex(tableName)
      .select('COLUMN_NAME', 'DATA_TYPE')
      .from(knex.raw('information_schema.COLUMNS'))
      .where(
        knex.raw(
          `TABLE_SCHEMA = ? AND
      TABLE_NAME = ? AND
      COLUMN_KEY = 'PRI'`,
          [database, tableName],
        ),
      );

    const primaryColumnsInLowercase = primaryColumns.map(objectKeysToLowercase) as PrimaryKeyDS[];
    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const knex = await this.configureKnex();
    const schema = this.connection.database;
    const query = `
      SELECT table_name, 'table' as type
      FROM information_schema.tables
      WHERE table_schema = ?
      UNION
      SELECT table_name, 'view' as type
      FROM information_schema.views
      WHERE table_schema = ?
    `;
    const [rows] = await knex.raw(query, [schema, schema]);

    return rows.map(({ TABLE_NAME, table_name, type }: any) => ({
      tableName: TABLE_NAME ?? table_name,
      isView: type === 'view',
    }));
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }

    const knex = await this.configureKnex();
    const { database } = this.connection;

    const structureColumns = await knex('information_schema.columns')
      .select(
        'column_name',
        'column_default',
        'data_type',
        'column_type',
        'is_nullable',
        'character_maximum_length',
        'extra',
      )
      .orderBy('ordinal_position')
      .where({
        table_schema: database,
        table_name: tableName,
      });

    const structureColumnsInLowercase = structureColumns.map(objectKeysToLowercase);

    structureColumnsInLowercase.forEach((element) => {
      element.is_nullable = element.is_nullable === 'YES';
      renameObjectKeyName(element, 'is_nullable', 'allow_null');

      switch (element.data_type) {
        case 'enum':
          element.data_type_params = element.column_type.slice(6, -2).split("','");
          break;
        case 'set':
          element.data_type_params = element.column_type.slice(5, -2).split("','");
          break;
      }

      element.character_maximum_length =
        element.character_maximum_length ?? getNumbersFromString(element.column_type) ?? null;
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
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');

    const tableStructure = await this.getTableStructure(tableName);

    const jsonColumnNames = tableStructure
      .filter(({ data_type }) => data_type.toLowerCase() === 'json')
      .map(({ column_name }) => column_name);

    Object.entries(row).forEach(([key, value]) => {
      if (jsonColumnNames.includes(key)) {
        row[key] = JSON.stringify(value);
      }
    });

    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');

    const tableStructure = await this.getTableStructure(tableName);

    const jsonColumnNames = tableStructure
      .filter(({ data_type }) => data_type.toLowerCase() === 'json')
      .map(({ column_name }) => column_name);

    Object.entries(newValues).forEach(([key, value]) => {
      if (jsonColumnNames.includes(key)) {
        newValues[key] = JSON.stringify(value);
      }
    });

    const primaryKeysNames = Object.keys(primaryKeys[0]);

    return await knex(tableName)
      .returning(primaryKeysNames)
      .whereIn(primaryKeysNames, primaryKeys.map(Object.values))
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
    const results: Array<ReferencedTableNamesAndColumnsDS> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
        `
    SELECT
    TABLE_NAME as 'table_name',
    COLUMN_NAME as 'column_name'
    FROM
    information_schema.KEY_COLUMN_USAGE
    WHERE
    REFERENCED_TABLE_NAME = ?
    AND REFERENCED_COLUMN_NAME = ?
    AND TABLE_SCHEMA = ?;
      `,
        [tableName, primaryColumn.column_name, this.connection.database],
      );
      let resultValue = result[0] || [];
      resultValue = Array.isArray(resultValue) ? resultValue : [resultValue];
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: resultValue,
      });
    }
    return results;
  }

  public async isView(tableName: string): Promise<boolean> {
    const knex = await this.configureKnex();
    const result = await knex('information_schema.tables').select('table_type').where({
      table_schema: this.connection.database,
      table_name: tableName,
    });
    if (result.length === 0) {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
    }
    return result[0].table_type === 'VIEW';
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<unknown>> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const offset = (page - 1) * perPage;
    const knex = await this.configureKnex();

    const [{ large_dataset }, tableStructure] = await Promise.all([
      this.getRowsCount(knex, null, tableName, this.connection.database),
      this.getTableStructure(tableName),
    ]);

    if (large_dataset) {
      throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    }

    const availableFields = this.findAvailableFields(settings, tableStructure);

    const rowsAsStream = knex(tableName)
      .select(availableFields)
      .modify((builder) => {
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (search_fields && searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
            }
          }
        }
      })
      .modify((builder) => {
        if (filteringFields && filteringFields.length > 0) {
          for (const filterObject of filteringFields) {
            const { field, criteria, value } = filterObject;
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
      .modify((builder) => {
        if (settings.ordering_field && settings.ordering) {
          builder.orderBy(settings.ordering_field, settings.ordering);
        }
      })
      .limit(perPage)
      .offset(offset)
      .stream();
    return rowsAsStream;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const knex = await this.configureKnex();
    const structure = await this.getTableStructure(tableName);
    const timestampColumnNames = structure
      .filter(({ data_type }) => isMySqlDateOrTimeType(data_type))
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
        for (const row of results) {
          for (const column of timestampColumnNames) {
            if (row[column] && !isMySQLDateStringByRegexp(row[column])) {
              const date = new Date(Number(row[column]));
              const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
              row[column] = formattedDate;
            }
          }

          await trx(tableName).insert(row);
        }
      });
    } catch (error) {
      throw error;
    }
  }

  public async executeRawQuery(query: string): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    return await knex.raw(query);
  }

  private async getRowsCount(
    knex: Knex<any, any[]>,
    countRowsQB: Knex.QueryBuilder<any, any[]> | null,
    tableName: string,
    database: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    if (countRowsQB) {
      const slowRowsCount = await this.getRowsCountByQueryWithTimeOut(countRowsQB);
      if (slowRowsCount) {
        return {
          rowsCount: slowRowsCount,
          large_dataset: slowRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
        };
      }
      const fastRowsCount = await this.getFastRowsCount(knex, tableName, database);
      return {
        rowsCount: fastRowsCount,
        large_dataset: fastRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
      };
    }

    const fastRowsCount = await this.getFastRowsCount(knex, tableName, database);
    if (fastRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
      return {
        rowsCount: fastRowsCount,
        large_dataset: true,
      };
    }
    const slowRowsCount = await this.getSlowRowsCount(knex, tableName);
    return {
      rowsCount: slowRowsCount,
      large_dataset: false,
    };
  }

  private async getRowsCountByQueryWithTimeOut(countRowsQB: Knex.QueryBuilder<any, any[]>): Promise<number | null> {
    return new Promise(async (resolve) => {
      setTimeout(() => {
        resolve(null);
      }, DAO_CONSTANTS.COUNT_QUERY_TIMEOUT_MS);

      try {
        const slowCount = (await countRowsQB.count('*'))[0]['count(*)'] as number;
        resolve(slowCount);
      } catch (_error) {
        resolve(null);
      }
    });
  }

  private async getSlowRowsCount(knex: Knex<any, any[]>, tableName: string): Promise<number | null> {
    const slowCount = (await knex(tableName).count('*'))[0]['count(*)'] as number;
    return slowCount;
  }

  private async getFastRowsCount(
    knex: Knex<any, any[]>,
    tableName: string,
    databaseName: string,
  ): Promise<number | null> {
    const fastCount = parseInt(
      (await knex.raw(`SHOW TABLE STATUS IN ?? LIKE ?;`, [databaseName, tableName]))[0][0].Rows,
    );
    return fastCount;
  }
}
