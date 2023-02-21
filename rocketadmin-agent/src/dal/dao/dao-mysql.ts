import { knex } from 'knex';
import { BasicDao } from '../shared/basic-dao';
import { Cacher } from '../../helpers/cache/cacher';
import { Constants } from '../../helpers/constants/constants';
import { FilterCriteriaEnum } from '../../enums';
import { IDaoInterface, IDaoRowsRO, ITestConnectResult } from '../shared/dao-interface';
import {
  checkFieldAutoincrement,
  getNumbersFromString,
  isObjectEmpty,
  listTables,
  objectKeysToLowercase,
  renameObjectKeyName,
  tableSettingsFieldValidator,
} from '../../helpers';
import {
  IAutocompleteFields,
  ICLIConnectionCredentials,
  IFilteringFields,
  IForeignKeyInfo,
  IStructureInfo,
  ITablePrimaryColumnInfo,
  ITableSettings,
} from '../../interfaces/interfaces';

export class DaoMysql extends BasicDao implements IDaoInterface {
  private readonly connection: ICLIConnectionCredentials;

  constructor(connection: ICLIConnectionCredentials) {
    super();
    this.connection = connection;
  }

  async addRowInTable(tableName: string, row: any): Promise<any> {
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
        row[key] = JSON.stringify(row[key]);
      }
    }
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKey = primaryColumns[0];
    const primaryKeyIndexInStructure = tableStructure
      .map((e) => {
        return e.column_name;
      })
      .indexOf(primaryKey.column_name);
    const primaryKeyStructure = tableStructure[primaryKeyIndexInStructure];

    const knex = await this.configureKnex(this.connection);
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    if (primaryColumns?.length > 0) {
      if (!checkFieldAutoincrement(primaryKeyStructure.column_default)) {
        const primaryKeys = primaryColumns.map((column) => column.column_name);
        try {
          await knex(tableName).insert(row);
          const resultsArray = [];
          for (let i = 0; i < primaryKeys.length; i++) {
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
          return {
            [primaryKey.column_name]: lastInsertId[0]['LAST_INSERT_ID()'],
          };
        } catch (e) {
          throw new Error(e);
        }
      }
    } else {
      await knex(tableName).insert(row);
    }
  }

  async deleteRowInTable(tableName: string, primaryKey: string): Promise<string> {
    const knex = await this.configureKnex(this.connection);
    await knex.raw('SET SQL_SAFE_UPDATES = 1;');
    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  async getRowByPrimaryKey(tableName: string, primaryKey: string, settings: ITableSettings): Promise<Array<string>> {
    if (!settings || isObjectEmpty(settings)) {
      return this.configureKnex(this.connection)(tableName).where(primaryKey);
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex(this.connection);
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
    const { rowsCount, large_dataset } = await this.getRowsCount(knex, tableName, this.connection.database);
    const lastPage = Math.ceil(rowsCount / perPage);
    /* eslint-enable */

    const availableFields = await this.findAvaliableFields(settings, tableName);
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
        large_dataset: large_dataset,
      };

      return rowsRO;
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
      .modify((builder) => {
        if (settings.ordering_field && settings.ordering) {
          builder.orderBy(settings.ordering_field, settings.ordering);
        }
      })
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
      large_dataset: large_dataset,
    };

    return rowsRO;
  }

  async getTablesFromDB(): Promise<Array<string>> {
    return await listTables(this.configureKnex(this.connection));
  }

  async getTablePrimaryColumns(tableName: string): Promise<Array<ITablePrimaryColumnInfo>> {
    const connection = this.connection;
    const knex = await this.configureKnex(this.connection);
    const primaryColumns = await knex(tableName)
      .select('COLUMN_NAME', 'DATA_TYPE')
      .from(knex.raw('information_schema.COLUMNS'))
      .where(
        knex.raw(
          `TABLE_SCHEMA = ? AND
      TABLE_NAME = ? AND
      COLUMN_KEY = 'PRI'`,
          [connection.database, tableName],
        ),
      );

    const primaryColumnsInLowercase = [];
    for (const primaryColumn of primaryColumns) {
      primaryColumnsInLowercase.push(objectKeysToLowercase(primaryColumn));
    }
    return primaryColumnsInLowercase;
  }

  async getTableStructure(tableName: string): Promise<Array<IStructureInfo>> {
    const connection = this.connection;
    const structureColumns = await this.configureKnex(this.connection)('information_schema.columns')
      .select('column_name', 'column_default', 'data_type', 'column_type', 'is_nullable', 'character_maximum_length')
      .where({
        table_schema: connection.database,
        table_name: tableName,
      });

    const structureColumnsInLowercase = [];

    for (const structureColumn of structureColumns) {
      structureColumnsInLowercase.push(objectKeysToLowercase(structureColumn));
    }

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

    return structureColumnsInLowercase;
  }

  configureKnex(connectionConfig: ICLIConnectionCredentials): any {
    const { host, username, password, database, port, ssl, cert } = connectionConfig;
    const cachedKnex = Cacher.getCachedKnex(connectionConfig);
    if (cachedKnex) {
      return cachedKnex;
    } else {
      const newKnex = knex({
        client: 'mysql2',
        connection: {
          host: host,
          user: username,
          password: password,
          database: database,
          port: port,
          ssl: ssl ? { ca: cert ?? undefined, rejectUnauthorized: !cert } : false,
        },
      });
      Cacher.setKnexCache(connectionConfig, newKnex);
      return newKnex;
    }
  }

  async updateRowInTable(tableName: string, row: any, primaryKey: string): Promise<string> {
    const knex = await this.configureKnex(this.connection);
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
        row[key] = JSON.stringify(row[key]);
      }
    }

    return await knex(tableName).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  async getTableForeignKeys(tableName: string): Promise<Array<IForeignKeyInfo>> {
    const knex = await this.configureKnex(this.connection);
    const connection = this.connection;

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
          [connection.database, tableName],
        ),
      );

    const foreignKeysInLowercase = [];
    for (const foreignKey of foreignKeys) {
      foreignKeysInLowercase.push(objectKeysToLowercase(foreignKey));
    }
    return foreignKeysInLowercase;
  }

  async validateSettings(settings: ITableSettings, tableName: string): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  async testConnect(): Promise<ITestConnectResult> {
    const knex = await this.configureKnex(this.connection);
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

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<string> {
    const knex = await this.configureKnex(this.connection);
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

  private async getRowsCount(
    knex: any,
    tableName: string,
    database: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    const fastCount = parseInt((await knex.raw(`SHOW TABLE STATUS IN ?? LIKE ?;`, [database, tableName]))[0][0].Rows);
    if (fastCount >= Constants.LARGE_DATASET_SIZE) {
      return { rowsCount: fastCount, large_dataset: true };
    }
    const slowCount = (await knex(tableName).count('*'))[0]['count(*)'] as number;
    return { rowsCount: slowCount, large_dataset: false };
  }
}
