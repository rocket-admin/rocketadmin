import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import getPort from 'get-port';
import { knex, Knex } from 'knex';
import { Client } from 'ssh2';
import { getSshMySqlClient } from '../../dal/dao-ssh/database/ssh-mysql-client';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { FilterCriteriaEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import {
  changeObjPropValByPropName,
  checkFieldAutoincrement,
  compareArrayElements,
  getNumbersFromString,
  getPropertyValueByDescriptor,
  isObjectEmpty,
  objectKeysToLowercase,
  renameObjectKeyName,
  tableSettingsFieldValidator,
} from '../../helpers';
import { Cacher } from '../../helpers/cache/cacher';
import { Constants } from '../../helpers/constants/constants';
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

export class DataAccessObjectMysqlSsh implements IDataAccessObject {
  private readonly connection: ConnectionEntity;

  constructor(connection: ConnectionEntity) {
    this.connection = connection;
  }

  public async addRowInTable(tableName: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
    const promisesResults = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    const tableStructure = promisesResults[0];
    const primaryColumns = promisesResults[1];
    const jsonColumnNames = tableStructure
      .filter((structEl) => {
        return structEl.data_type.toLowerCase() === 'json';
      })
      .map((structEl) => {
        return structEl.column_name;
      });
    for (const key in row) {
      if (jsonColumnNames.includes(key)) {
        row = changeObjPropValByPropName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }
    const primaryKeysInStructure = tableStructure.map((el) => {
      return tableStructure.find((structureEl) => structureEl.column_name === el.column_name);
    });

    const autoIncrementPrimaryKey = primaryKeysInStructure.find((key) =>
      checkFieldAutoincrement(key.column_default, key.extra),
    );

    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    if (primaryColumns?.length > 0) {
      const primaryKeys = primaryColumns.map((column) => column.column_name);
      if (!autoIncrementPrimaryKey) {
        try {
          await knex(tableName).connection(mySqlDriver).insert(row);
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
          await knex(tableName).connection(mySqlDriver).insert(row);
          const lastInsertId = await knex(tableName).connection(mySqlDriver).select(knex.raw(`LAST_INSERT_ID()`));
          const resultObj = {};
          for (const [index, el] of primaryColumns.entries()) {
            resultObj[el.column_name] = lastInsertId[index]['LAST_INSERT_ID()'];
          }
          return resultObj;
        } catch (e) {
          throw new Error(e);
        }
      }
    } else {
      await knex(tableName).connection(mySqlDriver).insert(row).returning(Object.keys(row));
    }
  }

  public async configureKnex(): Promise<Knex> {
    const { host, username, password, database, port, ssl, cert } = this.connection;
    const cachedKnex = Cacher.getCachedKnex(this.connection);
    if (cachedKnex) {
      return cachedKnex;
    }
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
      pool: { min: 0, max: 1 },
    });
    Cacher.setKnexCache(this.connection, newKnex);
    return newKnex;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    return await knex(tableName).connection(mySqlDriver).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    return await knex(tableName)
      .connection(mySqlDriver)
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
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    if (!settings) {
      const result = await knex(tableName).connection(mySqlDriver).where(primaryKey);
      return result[0] as unknown as Record<string, unknown>;
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const result = await knex(tableName).connection(mySqlDriver).select(availableFields).where(primaryKey);
    return result[0] as unknown as Record<string, unknown>;
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFieldsData>,
    autocompleteFields: IAutocompleteFieldsData,
    userEmail: string,
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
    const promisesResults = await Promise.all([
      this.getRowsCount(tableName, filteringFields, settings, searchedFieldValue),
      this.findAvaliableFields(settings, tableName),
    ]);
    const rowsCount = promisesResults[0];
    const availableFields = promisesResults[1];
    const lastPage = Math.ceil(rowsCount / perPage);
    const offset = (page - 1) * perPage;
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();

    let rowsRO;

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableName)
        .connection(mySqlDriver)
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
    const rows = await knex(tableName)
      .connection(mySqlDriver)
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
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
      .offset(offset);
    const pagination = {
      total: rowsCount,
      lastPage: lastPage,
      perPage: perPage,
      currentPage: page,
    };
    rowsRO = {
      data: rows,
      pagination,
    };

    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKey>> {
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    const foreignKeys = await knex(tableName)
      .connection(mySqlDriver)
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
    });
    Cacher.setTableForeignKeysCache(this.connection, tableName, foreignKeysInLowercase);
    return foreignKeysInLowercase;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    const primaryColumns = await knex(tableName)
      .connection(mySqlDriver)
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
    });
    Cacher.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();

    const structureColumns = await knex(tableName)
      .connection(mySqlDriver)
      .select(
        'column_name',
        'column_default',
        'data_type',
        'column_type',
        'is_nullable',
        'extra',
        'character_maximum_length',
      )
      .from('information_schema.columns')
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
    Cacher.setTableStructureCache(this.connection, tableName, structureColumnsInLowercase);
    return structureColumnsInLowercase;
  }

  public async getTablesFromDB(): Promise<Array<string>> {
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    const results = await knex('information_schema.tables').connection(mySqlDriver).select('table_name').where({
      table_schema: this.connection.database,
    });
    return results.map((row) => {
      if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
      if (row.hasOwnProperty('table_name')) return row.table_name;
    });
  }

  public async testConnect(): Promise<ITestConnectResult> {
    let mySqlDriver;
    let result;
    try {
      mySqlDriver = await this.getMySqlDriver();
    } catch (e) {
      return {
        result: false,
        message: e.message,
      };
    }
    const knex = await this.configureKnex();
    try {
      result = await knex().connection(mySqlDriver).select(1);
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
    userEmail: string,
  ): Promise<Record<string, unknown>> {
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
        row = changeObjPropValByPropName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }
    const mySqlDriver = await this.getMySqlDriver();
    const knex = await this.configureKnex();
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    return await knex(tableName)
      .connection(mySqlDriver)
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  public async validateSettings(
    settings: CreateTableSettingsDto,
    tableName: string,
    userEmail: string,
  ): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  private async getMySqlDriver(): Promise<Client> {
    const cachedDriver = Cacher.getDriverCache(this.connection);
    if (cachedDriver) {
      return cachedDriver;
    } else {
      const freePort = await getPort();
      let mySqlDriver;
      try {
        mySqlDriver = (await getSshMySqlClient(this.connection, freePort)) as Client;
        Cacher.setDriverCache(this.connection, mySqlDriver);
      } catch (e) {
        throw new HttpException(
          {
            message: `${Messages.FAILED_ESTABLISH_SSH_CONNECTION} ${e.message ? `"${e.message}".` : ''}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return mySqlDriver;
    }
  }

  private async getRowsCount(tableName, filteringFields, settings, searchedFieldValue): Promise<number> {
    const mySqlDriver = await this.getMySqlDriver();
    const { database } = this.connection;
    const { search_fields } = settings;
    const knex = await this.configureKnex();
    if (
      (filteringFields && filteringFields.length > 0) ||
      (search_fields && searchedFieldValue && search_fields.length > 0)
    ) {
      const count = await knex(tableName)
        .connection(mySqlDriver)
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
          /*eslint-disable*/
          if (search_fields && searchedFieldValue && search_fields.length > 0) {
            for (const field of search_fields) {
              builder.orWhereRaw(` CAST (?? AS CHAR (255))=?`, [field, searchedFieldValue]);
            }
          }
          /*eslint-enable*/
        })
        .count('*');
      return count[0]['count(*)'] as number;
    } else {
      async function countWithTimeout() {
        return new Promise(async function (resolve, reject) {
          setTimeout(() => {
            resolve(null);
          }, Constants.COUNT_QUERY_TIMEOUT_MS);
          const count = await knex(tableName).connection(mySqlDriver).count('*');
          const rowsCount = count[0]['count(*)'] as number;
          if (rowsCount) {
            resolve(rowsCount);
          } else {
            resolve(false);
          }
        });
      }

      const firstCount = (await countWithTimeout()) as number;
      if (firstCount) {
        return firstCount;
      } else {
        const secondCount = parseInt(
          (await knex.raw(`SHOW TABLE STATUS IN ?? LIKE ?;`, [database, tableName]).connection(mySqlDriver))[0][0].Rows,
        );
        return secondCount;
      }
    }
  }

  private async findAvaliableFields(settings: TableSettingsEntity, tableName: string): Promise<Array<string>> {
    let availableFields = [];
    const tableStructure = await this.getTableStructure(tableName);
    const fieldsFromStructure = tableStructure.map((el) => {
      return el.column_name;
    });
    if (isObjectEmpty(settings)) {
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
      return availableFields;
    }
    const excludedFields = settings.excluded_fields;
    if (settings.list_fields && settings.list_fields.length > 0) {
      if (!compareArrayElements(settings.list_fields, fieldsFromStructure)) {
        availableFields = [...settings.list_fields, ...fieldsFromStructure];
        availableFields = [...new Set(availableFields)];
        availableFields = availableFields.filter((fieldName) => {
          return fieldsFromStructure.includes(fieldName);
        });
      } else {
        availableFields = settings.list_fields;
      }
    } else {
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
}
