import { Knex } from 'knex';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { getPropertyValueByDescriptor } from '../../helpers/get-property-value-by-descriptor.js';
import { changeObjPropValByName } from '../../helpers/change-object-property-by-name.js';
import { getPropertyValue } from '../../helpers/get-property-value.js';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
import { setPropertyValue } from '../../helpers/set-property-value.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';

export class DataAccessObjectPostgres extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const knex: Knex<any, any[]> = await this.configureKnex();
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
        setPropertyValue(row, key, JSON.stringify(getPropertyValue(row, key)));
      }
    }

    if (primaryColumns?.length > 0) {
      const primaryKey = primaryColumns.map((column) => column.column_name);
      const result = await knex(tableName)
        .withSchema(this.connection.schema ?? 'public')
        .returning(primaryKey)
        .insert(row);
      return result[0] as unknown as Record<string, unknown>;
    }
    const rowFields = Object.keys(row);
    const result = await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .returning(rowFields)
      .insert(row);
    return result[0] as unknown as Record<string, unknown>;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<string[]> {
    const knex: Knex<any, any[]> = await this.configureKnex();
    return knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
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
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    if (!settings) {
      const knex: Knex<any, any[]> = await this.configureKnex();
      const result = await knex(tableName)
        .withSchema(this.connection.schema ?? 'public')
        .where(primaryKey);
      return result[0] as unknown as Record<string, unknown>;
    }
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvaliableFields(settings, tableStructure);
    const knex: Knex<any, any[]> = await this.configureKnex();
    const result = await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(availableFields)
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
    const tableSchema = this.connection.schema ?? 'public';
    const [{ rowsCount, large_dataset }, tableStructure] = await Promise.all([
      this.getRowsCount(knex, tableName, tableSchema),
      this.getTableStructure(tableName),
    ]);
    const availableFields = this.findAvaliableFields(settings, tableStructure);
    const lastPage = Math.ceil(rowsCount / perPage);
    let rowsRO: FoundRowsDS;

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      const rows = await knex(tableName)
        .withSchema(this.connection.schema ?? 'public')
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
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);

      rowsRO = {
        data: rows,
        pagination: {} as any,
        large_dataset: large_dataset,
      };
      return rowsRO;
    }

    const rows = await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(availableFields)
      .modify((builder) => {
        /*eslint-disable*/
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
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
    } as any;
    rowsRO = {
      data,
      pagination,
      large_dataset: large_dataset,
    };
    return rowsRO;
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const tableSchema = this.connection.schema ?? 'public';
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
    const resultKeys = foreignKeys.map((key) => {
      return {
        referenced_column_name: key.foreign_column_name,
        referenced_table_name: key.foreign_table_name,
        constraint_name: key.constraint_name,
        column_name: key.column_name,
      };
    });
    LRUStorage.setTableForeignKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    tableName = this.attachSchemaNameToTableName(tableName);
    const primaryColumns: Array<any> = await knex(tableName)
      .select(knex.raw('a.attname, format_type(a.atttypid, a.atttypmod) AS data_type'))
      .from(knex.raw('pg_index i'))
      .join(knex.raw('pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)'))
      .where(knex.raw(`i.indrelid = ?::regclass AND i.indisprimary;`, tableName));
    const resultKeys = primaryColumns.map((column) => {
      return {
        column_name: column.attname,
        data_type: column.data_type,
      };
    });
    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? 'public';
    const database = this.connection.database;
    const query = `
    SELECT table_name, table_type = 'VIEW' AS is_view
    FROM information_schema.tables
    WHERE table_schema = ?
        AND table_catalog = current_database()
    `;
    const bindings = [schema];
    try {
      const results = await knex.raw(query, bindings);
      console.log({ tablesPg: results });
      return results.rows.map((row: Record<string, unknown>) => ({ tableName: row.table_name, isView: !!row.is_view }));
    } catch (error) {
      console.log({ tablesPg: error });
      throw error;
    }
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
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
    LRUStorage.setTableStructureCache(this.connection, tableName, result);
    return result;
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
        row = changeObjPropValByName(row, key, JSON.stringify(getPropertyValueByDescriptor(row, key)));
      }
    }
    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
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
    const schema = this.connection.schema ? this.connection.schema : 'public';
    const knex = await this.configureKnex();
    const results: Array<ReferencedTableNamesAndColumnsDS> = [];
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
          u.table_catalog = current_database() AND
          u.table_schema = ? AND
          u.table_name = ?
      `,
        [primaryColumn.column_name, schema, tableName],
      );
      results.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: result.rows,
      });
    }
    return results;
  }

  public async isView(tableName: string): Promise<boolean> {
    const schema = this.connection.schema ? this.connection.schema : 'public';
    const knex = await this.configureKnex();
    const entityType = await knex('information_schema.tables')
      .select('table_type')
      .where('table_schema', schema)
      .andWhere('table_name', tableName);
    if (entityType.length === 0) throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
    return entityType[0].table_type === 'VIEW';
  }

  private async getRowsCount(
    knex: Knex<any, any[]>,
    tableName: string,
    tableSchema: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    try {
      const fastCount = await knex.raw(
        `
  SELECT ((reltuples / relpages)
  * (pg_relation_size('??.??') / current_setting('block_size')::int)
         )::bigint as count
FROM   pg_class
WHERE  oid = '??.??'::regclass;`,
        [tableSchema, tableName, tableSchema, tableName],
      );

      if (fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
        return {
          rowsCount: fastCount,
          large_dataset: true,
        };
      }
    } catch (e) {
      return { rowsCount: 0, large_dataset: false };
    }
    const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
    const slowCount = parseInt(count[0].count);
    return {
      rowsCount: slowCount,
      large_dataset: false,
    };
  }

  private attachSchemaNameToTableName(tableName: string): string {
    if (this.connection.schema) {
      tableName = `"${this.connection.schema}"."${tableName}"`;
    } else {
      tableName = `"public"."${tableName}"`;
    }
    return tableName;
  }
}
