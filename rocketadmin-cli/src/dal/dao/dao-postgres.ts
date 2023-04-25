import { BasicDao } from '../shared/basic-dao.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { Constants } from '../../helpers/constants/constants.js';
import { FilterCriteriaEnum } from '../../enums/filter-criteria.enum.js';
import { ICLIConnectionCredentials, ITableSettings } from '../../interfaces/interfaces.js';
import { IDaoInterface, IReferecedTableNamesAndColumns, ITestConnectResult } from '../shared/dao-interface.js';
import { isObjectEmpty } from '../../helpers/is-object-empty.js';
import { listTables } from '../../helpers/get-tables-helper.js';
import { renameObjectKeyName } from '../../helpers/rename-object-key-name.js';
import { tableSettingsFieldValidator } from '../../helpers/validators/table-settings-field-validator.js';
import knex from 'knex';

export class DaoPostgres extends BasicDao implements IDaoInterface {
  private readonly connection: ICLIConnectionCredentials;

  constructor(connection: ICLIConnectionCredentials) {
    super();
    this.connection = connection;
  }

  async addRowInTable(tableName: string, row: any): Promise<any> {
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
        row[key] = JSON.stringify(row[key]);
      }
    }

    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    if (primaryColumns?.length > 0) {
      const primaryKey = primaryColumns.map((column) => column.column_name);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(primaryKey)
        .insert(row);
      return result[0] as unknown as Record<string, unknown>;
    } else {
      const rowFields = Object.keys(row);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .returning(rowFields)
        .insert(row);
      return result[0] as any;
    }
  }

  async deleteRowInTable(tableName: string, primaryKey: any): Promise<any> {
    return this.configureKnex(this.connection)(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .del();
  }

  async getRowByPrimaryKey(tableName: string, primaryKey: any, settings: ITableSettings): Promise<any> {
    if (!settings || isObjectEmpty(settings)) {
      return this.configureKnex(this.connection)(tableName)
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .where(primaryKey);
    }
    const availableFields = await this.findAvaliableFields(settings, tableName);
    const knex = await this.configureKnex(this.connection);
    return await knex(tableName)
      .select(availableFields)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .where(primaryKey);
  }

  async getRowsFromTable(
    tableName: string,
    settings: ITableSettings,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
  ): Promise<any> {
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
    const count = await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .count('*');
    const rowsCount = parseInt(count[0].count);
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
        .withSchema(this.connection.schema ? this.connection.schema : 'public')
        .modify((builder) => {
          /*eslint-disable*/
          const { fields, value } = autocompleteFields;
          if (value !== '*') {
            for (const field of fields) {
              builder.orWhereRaw(`CAST (?? AS TEXT) LIKE '${value}%'`, [field]);
              //builder.orWhere(field, 'like', `${value}%`);
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
      };

      return rowsRO;
    }
    const rows = await knex(tableName)
      .select(availableFields)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .modify((builder) => {
        /*eslint-disable*/
        const { search_fields } = settings;
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
    let { pagination } = rows;
    pagination = {
      total: pagination.total ? pagination.total : rowsCount,
      lastPage: pagination.lastPage ? pagination.lastPage : lastPage,
      perPage: pagination.perPage,
      currentPage: pagination.currentPage,
    };
    rowsRO = {
      data,
      pagination,
    };
    return rowsRO;
  }

  async getTableForeignKeys(tableName: string): Promise<any> {
    const knex = await this.configureKnex(this.connection);
    const tableSchema = this.connection.schema ? this.connection.schema : 'public';
    const foreignKeys = await knex(tableName)
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

  async getTablePrimaryColumns(tableName: string): Promise<any> {
    const knex = await this.configureKnex(this.connection);
    tableName = this.attachSchemaNameToTableName(tableName);
    const primaryColumns = await knex(tableName)
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

  async getTablesFromDB(): Promise<any> {
    return await listTables(this.configureKnex(this.connection), this.connection.schema);
  }

  async getTableStructure(tableName: string): Promise<any> {
    const knex = await this.configureKnex(this.connection);
    const result = await knex('information_schema.columns')
      .select('column_name', 'column_default', 'data_type', 'udt_name', 'is_nullable', 'character_maximum_length')
      .where(`table_name`, tableName)
      .andWhere('table_schema', this.connection.schema ? this.connection.schema : 'public');
    const customTypeIndexes = [];
    for (let i = 0; i < result.length; i++) {
      result[i].is_nullable = result[i].is_nullable === 'YES';
      renameObjectKeyName(result[i], 'is_nullable', 'allow_null');
      if (result[i].data_type === 'USER-DEFINED') {
        customTypeIndexes.push(i);
      }
    }

    if (customTypeIndexes.length >= 0) {
      for (let i = 0; i < customTypeIndexes.length; i++) {
        const customTypeInTableName = result[customTypeIndexes[i]].udt_name;
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
          result[customTypeIndexes[i]].data_type = 'enum';
          result[customTypeIndexes[i]].data_type_params = enumLabelRows;
        }

        if (customTypeAttrs && customTypeAttrs.length > 0) {
          const customDataTypeRo = [];
          for (const attr of customTypeAttrs) {
            customDataTypeRo.push({
              column_name: attr.attname,
              data_type: attr.format_type,
            });
          }
          result[customTypeIndexes[i]].data_type = result[customTypeIndexes[i]].udt_name;
          result[customTypeIndexes[i]].data_type_params = customDataTypeRo;
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

  async updateRowInTable(tableName: string, row: any, primaryKey: any): Promise<any> {
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

    return this.configureKnex(this.connection)(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  async validateSettings(settings: ITableSettings, tableName: string): Promise<Array<string>> {
    const tableStructure = await this.getTableStructure(tableName);
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  configureKnex(connectionConfig: ICLIConnectionCredentials): any {
    return DaoPostgres.configureKnex(connectionConfig);
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

  private attachSchemaNameToTableName(tableName: string): string {
    if (this.connection.schema) {
      tableName = `"${this.connection.schema}"."${tableName}"`;
    } else {
      tableName = `"public"."${tableName}"`;
    }
    return tableName;
  }

  public static configureKnex(connectionConfig): any {
    const { host, username, password, database, port, type, cert, ssl } = connectionConfig;
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
          //ssl: ssl ? { ca: cert } : { rejectUnauthorized: false },
        },
      });
      Cacher.setKnexCache(connectionConfig, newKnex);
      return newKnex;
    }
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<IReferecedTableNamesAndColumns>> {
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const schema = this.connection.schema ? this.connection.schema : 'public';
    const knex = await this.configureKnex(this.connection);
    const results: Array<IReferecedTableNamesAndColumns> = [];
    for (const primaryColumn of primaryColumns) {
      const result = await knex.raw(
        `
      SELECT
          r.table_name, r.column_name
      FROM information_schema.constraint_column_usage       u
      INNER JOIN information_schema.referential_constraints fk
                 ON u.constraint_catalog = fk.unique_constraint_catalog
                     AND u.constraint_schema = fk.unique_constraint_schema
                     AND u.constraint_name = fk.unique_constraint_name
      INNER JOIN information_schema.key_column_usage        r
                 ON r.constraint_catalog = fk.constraint_catalog
                     AND r.constraint_schema = fk.constraint_schema
                     AND r.constraint_name = fk.constraint_name
      WHERE
          u.column_name = ? AND
          u.table_catalog = ? AND
          u.table_schema = ? AND
          u.table_name = ?
      `,
        [primaryColumn.column_name, this.connection.database, schema, tableName],
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: result.rows,
      });
    }
    return results;
  }

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<any> {
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

  static async clearKnexCache() {
    await Cacher.clearKnexCache();
  }
}
