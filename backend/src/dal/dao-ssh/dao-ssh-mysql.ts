import * as getPort from 'get-port';
import { knex, Knex } from 'knex';
import { Cacher } from '../../helpers/cache/cacher';
import { Constants } from '../../helpers/constants/constants';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { FilterCriteriaEnum } from '../../enums';
import { getSshMySqlClient } from './database/ssh-mysql-client';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { HttpStatus } from '@nestjs/common';
import { IDaoInterface, IDaoRowsRO, ITestConnectResult } from '../shared/dao-interface';
import { IForeignKeyInfo, IStructureInfo, ITablePrimaryColumnInfo } from '../../entities/table/table.interface';
import { Messages } from '../../exceptions/text/messages';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import {
  changeObjPropValByPropName,
  checkFieldAutoincrement,
  getNumbersFromString,
  getPropertyValueByDescriptor,
  isObjectEmpty,
  objectKeysToLowercase,
  renameObjectKeyName,
  tableSettingsFieldValidator,
} from '../../helpers';

export class DaoSshMysql implements IDaoInterface {
  private readonly connection: any;

  constructor(connection) {
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
        row = changeObjPropValByPropName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKey = primaryColumns[0];
    const primaryKeyIndexInStructure = tableStructure
      .map((e) => {
        return e.column_name;
      })
      .indexOf(primaryKey.column_name);
    const primaryKeyStructure = tableStructure.at(primaryKeyIndexInStructure);
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    if (primaryColumns?.length > 0) {
      if (!checkFieldAutoincrement(primaryKeyStructure.column_default)) {
        try {
          await knex(tableName).connection(mySqlDriver).insert(row);
          return {
            [primaryKey.column_name]: row[primaryKey.column_name],
          };
        } catch (e) {
          throw new Error(e);
        }
      } else {
        try {
          await knex(tableName).connection(mySqlDriver).insert(row);
          const lastInsertId = await knex(tableName).connection(mySqlDriver).select(knex.raw(`LAST_INSERT_ID()`));
          return {
            [primaryKey.column_name]: lastInsertId[0]['LAST_INSERT_ID()'],
          };
        } catch (e) {
          throw new Error(e);
        }
      }
    } else {
      await knex(tableName).connection(mySqlDriver).insert(row).returning(Object.keys(row));
    }
  }

  async configureKnex(connectionConfig): Promise<Knex> {
    const { host, username, password, database, port, type, ssl, cert } = connectionConfig;
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
        pool: { min: 0, max: 1 },
      });
      Cacher.setDriverCache(connectionConfig, newKnex);
      return newKnex;
    }
  }

  async deleteRowInTable(tableName: string, primaryKey: string): Promise<string> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    return await knex(tableName).connection(mySqlDriver).returning(Object.keys(primaryKey)).where(primaryKey).del();
  }

  async getRowByPrimaryKey(tableName: string, primaryKey, settings: TableSettingsEntity): Promise<Array<string>> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
    if (!settings || isObjectEmpty(settings)) {
      const result = await knex(tableName).connection(mySqlDriver).where(primaryKey);
      return result[0];
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const result = await knex(tableName).connection(mySqlDriver).select(availableFields).where(primaryKey);
    return result[0];
  }

  async getRowsFromTable(
    tableName: string,
    settings: any,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
  ): Promise<IDaoRowsRO> {
    /* eslint-disable */
    const mySqlDriver = await this.getMySqlDriver(this.connection);

    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };

    if (!page || page <= 0) {
      page = Constants.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = Constants.DEFAULT_PAGINATION.perPage;
      }
    }

    const rowsCount = await this.getRowsCount(tableName, filteringFields, settings, searchedFieldValue);
    const lastPage = Math.ceil(rowsCount / perPage);
    const offset = (page - 1) * perPage;
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex(connectionConfig);
    let rowsRO;

    if (
      autocompleteFields &&
      !isObjectEmpty(autocompleteFields) &&
      autocompleteFields.value &&
      autocompleteFields.fields.length > 0
    ) {
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

  async getTableForeignKeys(tableName: string): Promise<Array<IForeignKeyInfo>> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
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
          [database, tableName],
        ),
      );

    const foreignKeysInLowercase = [];
    for (const foreignKey of foreignKeys) {
      foreignKeysInLowercase.push(objectKeysToLowercase(foreignKey));
    }

    return foreignKeysInLowercase;
  }

  async getTablesFromDB(): Promise<Array<string>> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };

    const knex = await this.configureKnex(connectionConfig);
    const results = await knex('information_schema.tables').connection(mySqlDriver).select('table_name').where({
      table_schema: database,
    });
    return results.map((row) => {
      if (row.hasOwnProperty('TABLE_NAME')) return row.TABLE_NAME;
      if (row.hasOwnProperty('table_name')) return row.table_name;
    });
  }

  async getTablePrimaryColumns(tableName: string): Promise<Array<ITablePrimaryColumnInfo>> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
    const primaryColumns = await knex(tableName)
      .connection(mySqlDriver)
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

    const primaryColumnsInLowercase = [];
    for (const primaryColumn of primaryColumns) {
      primaryColumnsInLowercase.push(objectKeysToLowercase(primaryColumn));
    }
    return primaryColumnsInLowercase;
  }

  async getTableStructure(tableName: string): Promise<Array<IStructureInfo>> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
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
        table_schema: database,
        table_name: tableName,
      });
    const structureColumnsInLowercase = [];

    for (const structureColumn of structureColumns) {
      structureColumnsInLowercase.push(objectKeysToLowercase(structureColumn));
    }
    for (const element of structureColumnsInLowercase) {
      if (element.extra === 'auto_increment') {
        element.column_default = 'auto_increment';
      }
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

  async updateRowInTable(tableName: string, row: any, primaryKey: string): Promise<string> {
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

    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
    await knex.raw('SET SQL_SAFE_UPDATES = 1;').connection(mySqlDriver);
    return await knex(tableName)
      .connection(mySqlDriver)
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  async validateSettings(settings: CreateTableSettingsDto, tableName: string): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  async testConnect(): Promise<ITestConnectResult> {
    let mySqlDriver;
    let result;
    try {
      mySqlDriver = await this.getMySqlDriver(this.connection);
    } catch (e) {
      return {
        result: false,
        message: e.message,
      };
    }
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);

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

  private async getMySqlDriver(connection): Promise<any> {
    const cachedDriver = Cacher.getDriverCache(connection);
    if (cachedDriver) {
      return cachedDriver;
    } else {
      const freePort = await getPort();
      let mySqlDriver;
      try {
        mySqlDriver = (await getSshMySqlClient(connection, freePort)) as any;
        Cacher.setDriverCache(connection, mySqlDriver);
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
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const { search_fields } = settings;
    const knex = await this.configureKnex(connectionConfig);
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

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<string> {
    const mySqlDriver = await this.getMySqlDriver(this.connection);
    const { host, username, password, database, port, type, ssl, cert } = this.connection;
    const connectionConfig = {
      host: host,
      username: username,
      password: password,
      database: database,
      port: port,
      type: type,
      ssl: ssl,
      cert: cert,
    };
    const knex = await this.configureKnex(connectionConfig);
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
}
