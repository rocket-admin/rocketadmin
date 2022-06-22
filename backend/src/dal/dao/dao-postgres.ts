import { Knex, knex } from 'knex';
import { BasicDao } from '../shared/basic-dao';
import { Cacher } from '../../helpers/cache/cacher';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { Constants } from '../../helpers/constants/constants';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { FilterCriteriaEnum } from '../../enums';
import { IDaoInterface, ITestConnectResult } from '../shared/dao-interface';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import {
  changeObjPropValByPropName,
  getPropertyValueByDescriptor,
  isObjectEmpty,
  listTables,
  renameObjectKeyName,
  tableSettingsFieldValidator,
} from '../../helpers';
import { IForeignKeyInfo } from '../../entities/table/table.interface';
import { TunnelCreator } from '../shared/tunnel-creator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const types = require('pg').types;
const timestampOID = 1114;
/*
types.setTypeParser(1114, function(stringValue) {
  return stringValue;
});

types.setTypeParser(1184, function(stringValue) {
  return stringValue;
});
*/
types.setTypeParser(1186, (stringValue) => stringValue);

export class DaoPostgres extends BasicDao implements IDaoInterface {
  private readonly connection: ConnectionEntity;

  constructor(connection) {
    super();
    this.connection = connection;
  }

  async addRowInTable(tableName, row) {
    const knex = await this.configureKnex(this.connection);
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
    if (primaryColumns?.length > 0) {
      const primaryKey = primaryColumns[0];
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(primaryKey.column_name)
        .insert(row);
      return {
        [primaryKey.column_name]: result[0],
      };
    } else {
      const rowFields = Object.keys(row);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(rowFields)
        .insert(row);
      return result[0];
    }
  }

  async deleteRowInTable(tableName, primaryKey) {
    return (await this.configureKnex(this.connection))(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .del();
  }

  async getRowByPrimaryKey(tableName, primaryKey, settings: TableSettingsEntity) {
    if (!settings || isObjectEmpty(settings)) {
      return (await this.configureKnex(this.connection))(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .where(primaryKey);
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex(this.connection);
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .select(availableFields)
      .where(primaryKey);
  }

  async getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
  ) {
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
    const tableSchema = this.connection.schema ? this.connection.schema : 'public';
    const rowsCount = await this.getRowsCount(knex, tableName, tableSchema);
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
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .select(autocompleteFields.fields)
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            fields.map((field, index) => {
              builder.orWhereRaw(`CAST (?? AS TEXT) LIKE '${value}%'`, [field]);
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
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        const { search_fields } = settings;
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
      .paginate({
        perPage: perPage,
        currentPage: page,
        isLengthAware: true,
      });
    const { data } = rows;
    let { pagination } = rows;
    pagination = {
      total: pagination.total ? pagination.total : rowsCount,
      lastPage: pagination.lastPage ? pagination.lastPage : lastPage,
      perPage: pagination.perPage,
      currentPage: pagination.currentPage,
    } as any;
    rowsRO = {
      data,
      pagination,
    };
    return rowsRO;
  }

  async getTableForeignKeys(tableName: string): Promise<Array<IForeignKeyInfo>> {
    const knex = await this.configureKnex(this.connection);
    const tableSchema = this.connection.schema ? this.connection.schema : 'public';
    const foreignKeys: Array<{
      foreign_column_name: string;
      foreign_table_name: string;
      constraint_name: string;
      column_name: string;
    }> = await knex(tableName)
      .select(
        knex.raw(`tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name`),
      )
      .from(
        knex.raw(
          `information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=? AND tc.table_schema =?;`,
          [tableName, tableSchema],
        ),
      );
    const transformedForeignKeys = [];
    for (const foreignKey of foreignKeys) {
      transformedForeignKeys.push({
        /* eslint-disable */
        referenced_column_name: foreignKey.foreign_column_name,
        referenced_table_name: foreignKey.foreign_table_name,
        constraint_name: foreignKey.constraint_name,
        column_name: foreignKey.column_name,
        /* eslint-enable */
      });
    }
    return transformedForeignKeys;
  }

  async getTablePrimaryColumns(tableName) {
    const knex = await this.configureKnex(this.connection);
    tableName = this.attachSchemaNameToTableName(tableName);
    const primaryColumns: Array<any> = await knex(tableName)
      .select(knex.raw('a.attname, format_type(a.atttypid, a.atttypmod) AS data_type'))
      .from(knex.raw('pg_index i'))
      .join(knex.raw('pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)'))
      .where(knex.raw(`i.indrelid = ?::regclass AND i.indisprimary;`, tableName));

    const primaryColumnsToColumnName = [];
    for (const primaryColumn of primaryColumns) {
      primaryColumnsToColumnName.push({
        /* eslint-disable */
        column_name: primaryColumn.attname,
        data_type: primaryColumn.data_type,
        /* eslint-enable */
      });
    }

    return primaryColumnsToColumnName;
  }

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<string> {
    const knex = await this.configureKnex(this.connection);
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .modify((builder) => {
        if (identityColumnName) {
          builder.select(referencedFieldName, identityColumnName);
        } else {
          builder.select(referencedFieldName);
        }
      })
      .whereIn(referencedFieldName, fieldValues);
  }

  async getTablesFromDB() {
    return await listTables(await this.configureKnex(this.connection), this.connection.schema);
  }

  async getTableStructure(tableName) {
    const knex = await this.configureKnex(this.connection);
    let result = await knex('information_schema.columns')
      .select('column_name', 'column_default', 'data_type', 'udt_name', 'is_nullable', 'character_maximum_length')
      .orderBy('dtd_identifier')
      .where(`table_name`, tableName)
      .andWhere('table_schema', this.connection.schema ? this.connection.schema : 'public');
    const customTypeIndexes = [];
    result = result.map((element, i) => {
      element.is_nullable = element.is_nullable === 'YES';
      renameObjectKeyName(element, 'is_nullable', 'allow_null');
      if (element.data_type === 'USER-DEFINED') {
        customTypeIndexes.push(i);
      }
      return element;
    });

    if (customTypeIndexes.length >= 0) {
      for (let i = 0; i < customTypeIndexes.length; i++) {
        const customTypeInTableName = result[customTypeIndexes.at(i)].udt_name;
        const customTypeAttrsQueryResult = await knex.raw(
          `select attname, format_type(atttypid, atttypmod)
           from pg_type
                    join pg_class on pg_class.oid = pg_type.typrelid
                    join pg_attribute on pg_attribute.attrelid = pg_class.oid
           where typname = ?
           order by attnum`,
          customTypeInTableName,
        );
        const customTypeAttrs = customTypeAttrsQueryResult.rows;
        const enumLabelQueryResult = await knex.raw(
          `SELECT e.enumlabel
           FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
           WHERE t.typname = ?`,
          customTypeInTableName,
        );
        let enumLabelRows = [];
        if (enumLabelQueryResult && enumLabelQueryResult.rows && enumLabelQueryResult.rows.length > 0) {
          enumLabelRows = enumLabelQueryResult.rows;

          enumLabelRows = enumLabelRows.map((el) => {
            return el.enumlabel;
          });
        }
        if (enumLabelRows && enumLabelRows.length > 0) {
          //has own property check for preventing object injection
          if (result.hasOwnProperty(customTypeIndexes.at(i))) {
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type = 'enum';
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type_params = enumLabelRows;
          }
        }

        if (customTypeAttrs && customTypeAttrs.length > 0) {
          const customDataTypeRo = [];
          for (const attr of customTypeAttrs) {
            customDataTypeRo.push({
              column_name: attr.attname,
              data_type: attr.format_type,
            });
          }
          //has own property check for preventing object injection
          if (result.hasOwnProperty(customTypeIndexes.at(i))) {
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type =
              // eslint-disable-next-line security/detect-object-injection
              result[customTypeIndexes[i]].udt_name;
            // eslint-disable-next-line security/detect-object-injection
            result[customTypeIndexes[i]].data_type_params = customDataTypeRo;
          }
        }
      }
    }
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

  async updateRowInTable(tableName, row, primaryKey) {
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

    return (await this.configureKnex(this.connection))(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  async validateSettings(settings: CreateTableSettingsDto, tableName: string): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  async configureKnex(connectionConfig: ConnectionEntity): Promise<Knex> {
    const cachedKnex = Cacher.getCachedKnex(connectionConfig);
    if (cachedKnex) {
      return cachedKnex;
    }
    if (connectionConfig.ssh) {
      const newKnex = await TunnelCreator.createTunneledKnex(this.connection);
      Cacher.setKnexCache(connectionConfig, newKnex);
      return newKnex;
    } else {
      return DaoPostgres.configureKnex(connectionConfig);
    }
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

  private attachSchemaNameToTableName(tableName: string): string {
    if (this.connection.schema) {
      tableName = `"${this.connection.schema}"."${tableName}"`;
    } else {
      tableName = `"public"."${tableName}"`;
    }
    return tableName;
  }

  public static configureKnex(connectionConfig) {
    const { host, username, password, database, port, type, cert, ssl } = connectionConfig;
    const cachedKnex = Cacher.getCachedKnex(connectionConfig);
    if (cachedKnex) {
      return cachedKnex;
    } else {
      if (process.env.NODE_ENV === 'test') {
        const newKnex = knex({
          client: type,
          connection: {
            host: host,
            user: username,
            password: password,
            database: database,
            port: port,
          },
        });
        Cacher.setKnexCache(connectionConfig, newKnex);
        return newKnex;
      }
      const newKnex = knex({
        client: type,
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

  static async clearKnexCache() {
    await Cacher.clearKnexCache();
  }

  private async getRowsCount(knex: Knex, tableName: string, tableSchema: string): Promise<number> {
    async function countWithTimeout() {
      return new Promise(async function (resolve, reject) {
        setTimeout(() => {
          resolve(null);
        }, Constants.COUNT_QUERY_TIMEOUT_MS);
        const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
        const rowsCount = parseInt(count[0].count);
        if (rowsCount) {
          resolve(rowsCount);
        } else {
          resolve(false);
        }
      });
    }

    const firstCount = (await countWithTimeout()) as number;
    if (firstCount === 0) {
      return firstCount;
    }
    if (firstCount) {
      return firstCount;
    } else {
      try {
        const secondCount = await knex.raw(
          `
    SELECT ((reltuples / relpages)
    * (pg_relation_size('??.??') / current_setting('block_size')::int)
           )::bigint as count
FROM   pg_class
WHERE  oid = '??.??'::regclass;`,
          [tableSchema, tableName, tableSchema, tableName],
        );
        return secondCount;
      } catch (e) {
        return 0;
      }
    }
  }
}
