/* eslint-disable security/detect-object-injection */
import * as csv from 'csv';
import { Knex } from 'knex';
import { Readable, Stream } from 'node:stream';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { isPostgresDateOrTimeType, isPostgresDateStringByRegexp } from '../../helpers/is-database-date.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { nanoid } from 'nanoid';

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
      .filter(({ data_type }) => data_type.toLowerCase() === 'json' || data_type.toLowerCase() === 'jsonb')
      .map(({ column_name }) => column_name);

    const processedRow = { ...row };
    jsonColumnNames.forEach((key) => {
      if (key in processedRow) {
        processedRow[key] = JSON.stringify(processedRow[key]);
      }
    });

    const returningColumns =
      primaryColumns?.length > 0 ? primaryColumns.map(({ column_name }) => column_name) : Object.keys(row);

    const result = await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .returning(returningColumns)
      .insert(processedRow);

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
  ): Promise<Array<Record<string, unknown>>> {
    const knex: Knex<any, any[]> = await this.configureKnex();
    const columnsToSelect = identityColumnName ? [referencedFieldName, identityColumnName] : [referencedFieldName];
    return knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(columnsToSelect)
      .whereIn(referencedFieldName, fieldValues);
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const knex: Knex<any, any[]> = await this.configureKnex();
    let availableFields: string[] = [];

    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const result = await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(availableFields.length ? availableFields : '*')
      .where(primaryKey);

    return result[0] as unknown as Record<string, unknown>;
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    const knex: Knex<any, any[]> = await this.configureKnex();
    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const query = knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(availableFields.length ? availableFields : '*');

    primaryKeys.forEach((primaryKey) => {
      query.orWhere((builder) => {
        Object.entries(primaryKey).forEach(([column, value]) => {
          builder.andWhere(column, value);
        });
      });
    });

    const results = await query;
    return results as Array<Record<string, unknown>>;
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
    autocompleteFields: AutocompleteFieldsDS,
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const knex = await this.configureKnex();
    const tableSchema = this.connection.schema ?? 'public';
    if (!tableStructure) {
      tableStructure = await this.getTableStructure(tableName);
    }
    const availableFields = this.findAvailableFields(settings, tableStructure);

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      const { fields, value } = autocompleteFields;
      const rows = await knex(tableName)
        .withSchema(this.connection.schema ?? 'public')
        .select(fields)
        .modify((builder) => {
          if (value !== '*') {
            fields.forEach((field) => {
              builder.orWhereRaw(`CAST (?? AS TEXT) LIKE ?`, [field, `${value}%`]);
            });
          }
        })
        .limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT);

      const { large_dataset } = await this.getRowsCount(knex, null, tableName, tableSchema);
      return {
        data: rows,
        pagination: {} as any,
        large_dataset: large_dataset,
      };
    }
    const fastRowsCount = await this.getFastRowsCount(knex, tableName, tableSchema);
    const countRowsQB = knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .modify((builder) => {
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              if (fastRowsCount <= 1000) {
                builder.orWhereRaw(`LOWER(CAST(?? AS TEXT)) LIKE ?`, [field, `%${searchedFieldValue.toLowerCase()}%`]);
              }
              builder.orWhereRaw(`LOWER(CAST(?? AS VARCHAR(255))) LIKE ?`, [
                field,
                `${searchedFieldValue.toLowerCase()}%`,
              ]);
            }
          }
        }
      })
      .modify((builder) => {
        if (filteringFields?.length > 0) {
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
    const { large_dataset, rowsCount } = await this.getRowsCount(knex, countRowsQB, tableName, tableSchema);
    const pagination = {
      total: rowsCount,
      lastPage: Math.ceil(rowsCount / perPage),
      perPage: perPage,
      currentPage: page,
    };
    return {
      data: rows,
      pagination,
      large_dataset: large_dataset,
    };
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const tableSchema = this.connection.schema ?? 'public';
    const database = this.connection.database;
    const foreignKeys: Array<{
      foreign_column_name: string;
      foreign_table_name: string;
      constraint_name: string;
      column_name: string;
    }> = await knex(tableName)
      .select(
        knex.raw(`kcu.constraint_name,
      kcu.column_name,
      kcu2.table_name AS foreign_table_name,
      kcu2.column_name AS foreign_column_name`),
      )
      .from(
        knex.raw(
          `??.information_schema.table_constraints AS tc
      JOIN ??.information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      JOIN ??.information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
      JOIN ??.information_schema.key_column_usage AS kcu2
      ON rc.unique_constraint_name = kcu2.constraint_name
      AND rc.unique_constraint_schema = kcu2.table_schema
      AND kcu.ordinal_position = kcu2.ordinal_position
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=? AND tc.table_schema =?;`,
          [database, database, database, database, tableName, tableSchema],
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
    const primaryColumns: Array<any> = await knex('pg_index i')
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
    const query = `
    SELECT table_name, table_type = 'VIEW' AS is_view
    FROM information_schema.tables
    WHERE table_schema = ?
        AND table_catalog = current_database()
    `;
    const bindings = [schema];
    try {
      const results = await knex.raw(query, bindings);
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
      .select(
        'column_name',
        'column_default',
        'data_type',
        'udt_name',
        'is_nullable',
        'character_maximum_length',
        'is_identity',
        'identity_generation',
      )
      .orderBy('dtd_identifier')
      .where(`table_name`, tableName)
      .andWhere('table_schema', this.connection.schema ? this.connection.schema : 'public');

    const generatedIdentities: Array<string> = ['BY DEFAULT', 'ALWAYS'];
    const customTypeIndexes: Array<number> = [];
    result = result.map((element, i) => {
      const { is_nullable, data_type, identity_generation } = element;
      element.allow_null = is_nullable === 'YES';
      delete element.is_nullable;
      if (data_type === 'USER-DEFINED') {
        customTypeIndexes.push(i);
      }
      element.extra = generatedIdentities.includes(identity_generation) ? 'auto_increment' : undefined;
      return element;
    });

    if (customTypeIndexes.length > 0) {
      for (const index of customTypeIndexes) {
        const customTypeInTableName = result[index].udt_name;
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
          enumLabelRows = enumLabelQueryResult.rows.map((el) => el.enumlabel);
        }
        if (enumLabelRows.length > 0) {
          result[index].data_type = 'enum';
          result[index].data_type_params = enumLabelRows;
        }

        if (customTypeAttrs && customTypeAttrs.length > 0) {
          const customDataTypeRo = customTypeAttrs.map((attr) => ({
            column_name: attr.attname,
            data_type: attr.format_type,
          }));
          result[index].data_type = result[index].udt_name;
          result[index].data_type_params = customDataTypeRo;
        }
      }
    }

    LRUStorage.setTableStructureCache(this.connection, tableName, result);
    return result;
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    if (!this.connection.id) {
      this.connection.id = nanoid(6);
    }
    const knex = await this.configureKnex();
    try {
      await knex.queryBuilder().select(1);
      return {
        result: true,
        message: 'Successfully connected',
      };
    } catch (e) {
      return {
        result: false,
        message: e.message || 'Connection failed',
      };
    } finally {
      LRUStorage.delKnexCache(this.connection);
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const tableStructure = await this.getTableStructure(tableName);
    const jsonColumnNames = tableStructure
      .filter(({ data_type }) => data_type.toLowerCase() === 'json' || data_type.toLowerCase() === 'jsonb')
      .map(({ column_name }) => column_name);

    const updatedRow = { ...row };
    jsonColumnNames.forEach((key) => {
      if (key in updatedRow) {
        updatedRow[key] = JSON.stringify(updatedRow[key]);
      }
    });

    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(updatedRow);
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Record<string, unknown>[]> {
    const tableStructure = await this.getTableStructure(tableName);
    const jsonColumnNames = tableStructure
      .filter(({ data_type }) => data_type.toLowerCase() === 'json' || data_type.toLowerCase() === 'jsonb')
      .map(({ column_name }) => column_name);

    const updatedValues = { ...newValues };
    jsonColumnNames.forEach((key) => {
      if (key in updatedValues) {
        updatedValues[key] = JSON.stringify(updatedValues[key]);
      }
    });

    const knex = await this.configureKnex();

    return await knex.transaction(async (trx) => {
      const results = [];
      for (const primaryKey of primaryKeys) {
        const result = await trx(tableName)
          .withSchema(this.connection.schema ?? 'public')
          .returning(Object.keys(primaryKey))
          .where(primaryKey)
          .update(updatedValues);
        results.push(result[0]);
      }
      return results;
    });
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    const knex = await this.configureKnex();

    if (primaryKeys.length === 0) {
      return 0;
    }

    await knex.transaction(async (trx) => {
      await trx(tableName)
        .withSchema(this.connection.schema ?? 'public')
        .delete()
        .modify((queryBuilder) => {
          primaryKeys.forEach((key) => {
            queryBuilder.orWhere((builder) => {
              Object.entries(key).forEach(([column, value]) => {
                builder.andWhere(column, value);
              });
            });
          });
        });
    });

    return primaryKeys.length;
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
    const schema = this.connection.schema ?? 'public';
    const knex = await this.configureKnex();

    const results = await Promise.all(
      primaryColumns.map(async (primaryColumn) => {
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
        return {
          referenced_on_column_name: primaryColumn.column_name,
          referenced_by: result.rows,
        };
      }),
    );

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

    // const tableSchema = this.connection.schema ?? 'public';

    // const [{ large_dataset }, tableStructure] = await Promise.all([
    //   this.getRowsCount(knex, null, tableName, tableSchema),
    //   this.getTableStructure(tableName),
    // ]);

    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    // if (large_dataset) {
    //   throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    // }
    const rowsAsStream = knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .select(availableFields)
      .modify((builder) => {
        let { search_fields } = settings;
        if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
          search_fields = availableFields;
        }
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(`LOWER(CAST(?? AS VARCHAR(255))) LIKE ?`, [
                field,
                `${searchedFieldValue.toLowerCase()}%`,
              ]);
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
      .filter(({ data_type }) => isPostgresDateOrTimeType(data_type))
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
            if (row[column] && !isPostgresDateStringByRegexp(row[column])) {
              const date = new Date(Number(row[column]));
              row[column] = date.toISOString();
            }
          }

          await trx(tableName)
            .withSchema(this.connection.schema ?? 'public')
            .insert(row);
        }
      });
    } catch (error) {
      throw error;
    }
  }

  public async executeRawQuery(query: string): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    return knex.raw(query);
  }

  private async getRowsCount(
    knex: Knex<any, any[]>,
    countRowsQB: Knex.QueryBuilder<any, any[]> | null,
    tableName: string,
    tableSchema: string,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    if (countRowsQB) {
      const slowRowsCount = await this.getRowsCountByQueryWithTimeOut(countRowsQB);
      if (slowRowsCount) {
        return {
          rowsCount: slowRowsCount,
          large_dataset: slowRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
        };
      }
      const fastRowsCount = await this.getFastRowsCount(knex, tableName, tableSchema);
      return {
        rowsCount: fastRowsCount,
        large_dataset: fastRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
      };
    }

    const fastRowsCount = await this.getFastRowsCount(knex, tableName, tableSchema);

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
        const count = (await countRowsQB.count('*')) as any;
        const slowCount = parseInt(count[0].count);
        resolve(slowCount);
      } catch (_error) {
        resolve(null);
      }
    });
  }

  private async getSlowRowsCount(knex: Knex<any, any[]>, tableName: string): Promise<number | null> {
    const count = (await knex(tableName)
      .withSchema(this.connection.schema ?? 'public')
      .count('*')) as any;
    const slowCount = parseInt(count[0].count);
    return slowCount;
  }

  private async getFastRowsCount(
    knex: Knex<any, any[]>,
    tableName: string,
    tableSchema: string,
  ): Promise<number | null> {
    const fastCount = await knex.raw(
      `
      SELECT CASE
      WHEN relpages = 0 THEN 0
      ELSE ((reltuples / relpages)
      * (pg_relation_size('??.??') / current_setting('block_size')::int)
             )::bigint
    END as count
    FROM   pg_class
    WHERE  oid = '??.??'::regclass;`,
      [tableSchema, tableName, tableSchema, tableName],
    );
    return parseInt(fastCount);
  }

  private attachSchemaNameToTableName(tableName: string): string {
    let fullTableName: string;
    if (this.connection.schema) {
      fullTableName = `"${this.connection.schema}"."${tableName}"`;
    } else {
      fullTableName = `"public"."${tableName}"`;
    }
    return fullTableName;
  }
}
