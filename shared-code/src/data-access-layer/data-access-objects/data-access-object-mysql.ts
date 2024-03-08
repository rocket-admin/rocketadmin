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
import { Stream } from 'node:stream';

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
    const jsonColumnNames = tableStructure
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });

    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        setPropertyValue(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }

    const primaryKeysInStructure = tableStructure.map((el) => {
      return tableStructure.find((structureEl) => structureEl.column_name === el.column_name);
    });

    const autoIncrementPrimaryKey = primaryKeysInStructure.find((key) =>
      checkFieldAutoincrement(key.column_default, key.extra),
    );

    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    if (primaryColumns?.length > 0) {
      const primaryKeys = primaryColumns.map((column) => column.column_name);
      if (!autoIncrementPrimaryKey) {
        try {
          await knex(tableName).insert(row);
          const resultsArray = [];
          for (let i = 0; i < primaryKeys.length; i++) {
            // eslint-disable-next-line security/detect-object-injection
            resultsArray.push([primaryKeys[i], row[primaryKeys[i]]]);
          }
          return Object.fromEntries(resultsArray);
        } catch (e) {
          throw new Error(e);
        }
      } else {
        try {
          await knex(tableName).insert(row);
          const lastInsertId = await knex(tableName).select(knex.raw(`LAST_INSERT_ID()`));
          const resultObj = {};
          for (const [index, el] of primaryColumns.entries()) {
            // eslint-disable-next-line security/detect-object-injection
            resultObj[el.column_name] = lastInsertId[index]['LAST_INSERT_ID()'];
          }
          return resultObj;
        } catch (e) {
          throw new Error(e);
        }
      }
    } else {
      await knex(tableName).insert(row).returning(Object.keys(row));
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
    tableSettings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    if (!tableSettings) {
      const result = await knex(tableName).where(primaryKey);
      return result[0] as Record<string, unknown>;
    }
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(tableSettings, tableStructure);
    const result = await knex(tableName).select(availableFields).where(primaryKey);
    return result[0] as Record<string, unknown>;
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
    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }
    const knex = await this.configureKnex();
    const [tableStructure] = await Promise.all([this.getTableStructure(tableName)]);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    let rowsRO: FoundRowsDS;

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
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);
      const { large_dataset } = await this.getRowsCount(knex, null, tableName, this.connection.database);
      rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset: large_dataset,
      };

      return rowsRO;
    }

    const countRowsQB = knex(tableName)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (search_fields && searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` LOWER(CAST (?? AS CHAR (255))) LIKE ?`, [
                field,
                `${searchedFieldValue.toLowerCase()}%`,
              ]);
              //  builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
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
      perPage: perPage,
      currentPage: page,
    };
    rowsRO = {
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
          [this.connection.database, tableName],
        ),
      );

    const foreignKeysInLowercase = foreignKeys.map((key) => {
      return objectKeysToLowercase(key);
    }) as ForeignKeyDS[];
    LRUStorage.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const primaryColumns = await knex(tableName)
      .select('COLUMN_NAME', 'DATA_TYPE')
      .from(knex.raw('information_schema.COLUMNS'))
      .where(
        knex.raw(
          `TABLE_SCHEMA = ? AND
      TABLE_NAME = ? AND
      COLUMN_KEY = 'PRI'`,
          [this.connection.database, tableName],
        ),
      );

    const primaryColumnsInLowercase = primaryColumns.map((column) => {
      return objectKeysToLowercase(column);
    }) as PrimaryKeyDS[];
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
    return rows.map((row: any) => {
      return {
        tableName: row.hasOwnProperty('TABLE_NAME') ? row.TABLE_NAME : row.table_name,
        isView: row.type === 'view',
      };
    });
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
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
        table_schema: this.connection.database,
        table_name: tableName,
      });

    const structureColumnsInLowercase = structureColumns.map((column) => {
      return objectKeysToLowercase(column);
    });

    for (const element of structureColumnsInLowercase) {
      element.is_nullable = element.is_nullable === 'YES';
      renameObjectKeyName(element, 'is_nullable', 'allow_null');
      if (element.data_type === 'enum') {
        const receivedStr = element.column_type.slice(6, element.column_type.length - 2);
        element.data_type_params = receivedStr.split("','");
      }
      if (element.data_type === 'set') {
        const receivedStr = element.column_type.slice(5, element.column_type.length - 2);
        element.data_type_params = receivedStr.split("','");
      }
      element.character_maximum_length = element.character_maximum_length
        ? element.character_maximum_length
        : getNumbersFromString(element.column_type)
          ? getNumbersFromString(element.column_type)
          : null;
    }
    LRUStorage.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase as TableStructureDS[]);
    return structureColumnsInLowercase as TableStructureDS[];
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const knex = await this.configureKnex();
    let result: { result: boolean; message: string };
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

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    const tableStructure = await this.getTableStructure(tableName);
    const jsonColumnNames = tableStructure
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });
    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        setPropertyValue(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }

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
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });
    for (const key in newValues) {
      if (jsonColumnNames.includes(key)) {
        setPropertyValue(newValues, key, JSON.stringify(getPropertyValueByDescriptor(newValues, key)));
      }
    }

    const primaryKeysNames = Object.keys(primaryKeys[0]);
    const primaryKeysValues = primaryKeys.map((key) => {
      return Object.values(key);
    });

    return await knex(tableName)
      .returning(Object.keys(primaryKeys[0]))
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
    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }

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
      } catch (error) {
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
