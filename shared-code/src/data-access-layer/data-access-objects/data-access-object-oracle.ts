/* eslint-disable security/detect-object-injection */
import * as csv from 'csv';
import { Knex } from 'knex';
import { nanoid } from 'nanoid';
import { Readable, Stream } from 'node:stream';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import {
  isOracleDateOrTimeType,
  isOracleDateStringByRegexp,
  isOracleDateType,
  isOracleTimeType,
} from '../../helpers/is-database-date.js';
import { objectKeysToLowercase } from '../../helpers/object-kyes-to-lowercase.js';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
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
import { FilterCriteriaEnum } from '../../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

type RefererencedConstraint = {
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  TABLE_NAME_ON: string;
  COLUMN_NAME_ON: string;
};

export class DataAccessObjectOracle extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const knex = await this.configureKnex();

    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);

    const primaryKeys: Array<string> = primaryColumns.map(({ column_name }) => column_name);

    const schema = this.connection.schema ?? this.connection.username.toUpperCase();

    const timestampColumnNames = tableStructure
      .filter(({ data_type }) => isOracleTimeType(data_type))
      .map(({ column_name }) => column_name);

    const dateColumnNames = tableStructure
      .filter(({ data_type }) => isOracleDateType(data_type))
      .map(({ column_name }) => column_name);

    Object.keys(row).forEach((key) => {
      if (timestampColumnNames.includes(key) && row[key]) {
        row[key] = this.formatTimestamp(row[key] as string);
      }
      if (dateColumnNames.includes(key) && row[key]) {
        row[key] = this.formatDate(new Date(row[key] as string));
      }
    });

    const insertResult = await knex(tableName).withSchema(schema).returning(primaryKeys).insert(row);
    const responseObject = {};
    primaryKeys.forEach((key) => {
      responseObject[key] = insertResult[0][key];
    });
    return responseObject;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const knex = await this.configureKnex();
      return knex(tableName)
        .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
        .where(primaryKey)
        .del();
    } catch (error) {
      console.error(`Error deleting row in table ${tableName}:`, error);
      throw error;
    }
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    tableName = this.attachSchemaNameToTableName(tableName);
    const columnsForSelect = [referencedFieldName];
    if (identityColumnName) {
      columnsForSelect.push(identityColumnName);
    }
    return await knex.transaction((trx) => {
      knex
        .raw(
          `SELECT ${columnsForSelect.map((_) => '??').join(', ')}
           FROM ${tableName}
           WHERE ?? IN (${fieldValues.map((_) => '?').join(', ')})`,
          [...columnsForSelect, referencedFieldName, ...fieldValues],
        )
        .transacting(trx)
        .then(trx.commit)
        .catch(trx.rollback);
    });
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    tableSettings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    try {
      const schema = this.connection.schema ?? this.connection.username.toUpperCase();
      const knex = await this.configureKnex();
      let query = knex(tableName).withSchema(schema).where(primaryKey);

      if (tableSettings) {
        const tableStructure = await this.getTableStructure(tableName);
        const availableFields = this.findAvailableFields(tableSettings, tableStructure);
        query = query.select(availableFields);
      }

      const result = await query;
      return result[0] as unknown as Record<string, unknown>;
    } catch (error) {
      console.error(`Error getting row by primary key from table ${tableName}:`, error);
      throw error;
    }
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    let availableFields: string[] = [];

    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const query = knex(tableName)
      .withSchema(schema)
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
    const knex = await this.configureKnex();

    if (autocompleteFields?.value && autocompleteFields?.fields?.length > 0) {
      const andWhere = autocompleteFields.fields
        .map((_, i) => `${i === 0 ? ' WHERE' : ' OR'} CAST (?? AS VARCHAR (255)) LIKE '${autocompleteFields.value}%'`)
        .join('');

      tableName = this.attachSchemaNameToTableName(tableName);

      const rows = await knex.transaction(async (trx) => {
        try {
          const result = await knex
            .raw(
              `SELECT ${autocompleteFields.fields.map((_) => '??').join(', ')}
         FROM ${tableName} ${andWhere} FETCH FIRST ${DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT} ROWS ONLY`,
              [...autocompleteFields.fields, ...autocompleteFields.fields],
            )
            .transacting(trx);
          trx.commit();
          return result;
        } catch (error) {
          trx.rollback();
          throw error;
        }
      });

      return {
        data: rows as Array<Record<string, unknown>>,
        pagination: {} as any,
        large_dataset: false,
      };
    }

    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    if (!tableStructure) {
      tableStructure = await this.getTableStructure(tableName);
    }
    const availableFields = this.findAvailableFields(settings, tableStructure);
    const timestampColumnNames = tableStructure
      .filter(({ data_type }) => isOracleTimeType(data_type))
      .map(({ column_name }) => column_name);

    const datesColumnsNames = tableStructure
      .filter(({ data_type }) => isOracleDateType(data_type))
      .map(({ column_name }) => column_name);

    const searchedFields =
      settings?.search_fields?.length > 0 ? settings.search_fields : searchedFieldValue ? availableFields : [];

    const tableSchema = this.connection.schema || this.connection.username.toUpperCase();
    return await this.getAvailableFieldsWithPagination(
      knex,
      tableName,
      tableSchema,
      page,
      perPage,
      availableFields,
      searchedFields,
      searchedFieldValue,
      filteringFields,
      settings,
      timestampColumnNames,
      datesColumnsNames,
    );
  }

  public async getAvailableFieldsWithPagination(
    knex: Knex<any, any[]>,
    tableName: string,
    tableSchema: string,
    page: number,
    perPage: number,
    availableFields: Array<string>,
    searchedFields: Array<string>,
    searchedFieldValue: any,
    filteringFields: FilteringFieldsDS[],
    settings: TableSettingsDS,
    timestampColumnNames: Array<string>,
    datesColumnsNames: Array<string>,
  ) {
    const offset = (page - 1) * perPage;
    const { rowsCount: fastCount } = await this.getRowsCount(knex, tableName, tableSchema);
    const applySearchFields = (builder: Knex.QueryBuilder) => {
      if (searchedFieldValue && searchedFields.length > 0) {
        for (const field of searchedFields) {
          if (Buffer.isBuffer(searchedFieldValue)) {
            builder.orWhere(field, '=', searchedFieldValue);
          } else {
            if (fastCount <= 1000) {
              builder.orWhereRaw(` Lower(??) LIKE ?`, [field, `%${searchedFieldValue.toLowerCase()}%`]);
            } else {
              builder.orWhereRaw(` Lower(??) LIKE ?`, [field, `${searchedFieldValue.toLowerCase()}%`]);
            }
          }
        }
      }
    };

    const applyFilteringFields = (
      builder: Knex.QueryBuilder,
      timestampColumnNames: Array<string>,
      datesColumnsNames: Array<string>,
    ) => {
      if (filteringFields && filteringFields.length > 0) {
        // eslint-disable-next-line prefer-const
        for (let { field, criteria, value } of filteringFields) {
          if (datesColumnsNames.includes(field) && value) {
            const valueToDate = new Date(String(value));
            value = this.formatDate(valueToDate);
          }
          if (timestampColumnNames.includes(field) && value) {
            value = this.formatTimestamp(String(value));
          }
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
    };

    const applyOrdering = (builder: Knex.QueryBuilder) => {
      if (settings.ordering_field && settings.ordering) {
        builder.orderBy(settings.ordering_field, settings.ordering);
      }
    };

    const rows = await knex(tableName)
      .withSchema(tableSchema)
      .select(availableFields)
      .modify(applySearchFields)
      .modify((builder) => applyFilteringFields(builder, timestampColumnNames, datesColumnsNames))
      .modify(applyOrdering)
      .limit(perPage)
      .offset(offset);

    const { rowsCount, large_dataset } = await this.getRowsCount(knex, tableName, tableSchema);
    const lastPage = Math.ceil(rowsCount / perPage);

    return {
      data: rows.map((row) => {
        delete row['ROWNUM_'];
        return row;
      }),
      pagination: {
        total: rowsCount,
        lastPage: lastPage,
        perPage: perPage,
        currentPage: page,
      },
      large_dataset: large_dataset,
    };
  }

  public async getRowsCount(knex: Knex<any, any[]>, tableName: string, tableSchema: string) {
    const fastCount = await this.getFastRowsCount(knex, tableName, tableSchema);
    if (fastCount && fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
      return { rowsCount: fastCount, large_dataset: true };
    }

    const rowsCount = await this.slowCountWithTimeOut(knex, tableName, tableSchema);
    return { rowsCount: rowsCount, large_dataset: false };
  }

  public async getFastRowsCount(
    knex: Knex<any, any[]>,
    tableName: string,
    tableSchema: string,
  ): Promise<number | null> {
    const fastCountQueryResult = await knex('ALL_TABLES')
      .select('NUM_ROWS')
      .where('TABLE_NAME', '=', tableName)
      .andWhere('OWNER', '=', tableSchema);
    if (!fastCountQueryResult[0]) {
      return null;
    }
    const fastCount = fastCountQueryResult[0]['NUM_ROWS'];
    return fastCount;
  }

  public async slowCountWithTimeOut(knex: Knex<any, any[]>, tableName: string, tableSchema: string) {
    const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
    const rowsCount = parseInt(count[0]['COUNT(*)']);
    return rowsCount;
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }

    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();

    const foreignKeysQuery = `
      SELECT a.constraint_name,
             a.table_name,
             a.column_name,
             c.owner,
             c_pk.table_name r_table_name,
             b.column_name   r_column_name
      FROM user_cons_columns a
      JOIN user_constraints c ON a.owner = c.owner
          AND a.constraint_name = c.constraint_name
      JOIN user_constraints c_pk ON c.r_owner = c_pk.owner
          AND c.r_constraint_name = c_pk.constraint_name
      JOIN user_cons_columns b ON C_PK.owner = b.owner
          AND C_PK.CONSTRAINT_NAME = b.constraint_name AND b.POSITION = a.POSITION
      WHERE c.constraint_type = 'R'
        AND a.table_name = ?
        AND a.OWNER = ?
    `;

    const foreignKeys = await knex.raw(foreignKeysQuery, [tableName, schema]);

    const resultKeys = foreignKeys.map(({ R_COLUMN_NAME, R_TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME }: any) => ({
      referenced_column_name: R_COLUMN_NAME,
      referenced_table_name: R_TABLE_NAME,
      constraint_name: CONSTRAINT_NAME,
      column_name: COLUMN_NAME,
    })) as ForeignKeyDS[];

    LRUStorage.setTableForeignKeysCache(this.connection, tableName, resultKeys);

    return resultKeys;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();

    const primaryColumnsQuery = `
      cols.table_name = ?
      AND cols.owner = ?
      AND cons.constraint_type = 'P'
      AND cons.constraint_name = cols.constraint_name
      AND cons.owner = cols.owner
    `;

    const primaryColumns = await knex(tableName)
      .select(knex.raw('cols.column_name'))
      .from(knex.raw('all_constraints cons, all_cons_columns cols'))
      .where(knex.raw(primaryColumnsQuery, [tableName, schema]));

    const primaryColumnsInLowercase = primaryColumns.map((column) => {
      return objectKeysToLowercase(column);
    });

    LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase as PrimaryKeyDS[]);
    return primaryColumnsInLowercase as PrimaryKeyDS[];
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const knex = await this.configureKnex();
    const query = `
      SELECT object_name, object_type
      FROM all_objects
      WHERE owner = ?
      AND object_type IN ('TABLE', 'VIEW')
    `;
    const result = await knex.raw<{ OBJECT_NAME: string; OBJECT_TYPE: string }[]>(query, [schema]);
    return result.map((row) => {
      return {
        tableName: row.OBJECT_NAME,
        isView: row.OBJECT_TYPE === 'VIEW',
      };
    });
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const structureColumns = await knex
      .queryBuilder()
      .select('COLUMN_NAME', 'DATA_DEFAULT', 'DATA_TYPE', 'NULLABLE', 'DATA_LENGTH')
      .from('ALL_TAB_COLUMNS')
      .orderBy('COLUMN_ID')
      .where(`TABLE_NAME`, `${tableName}`)
      .andWhere(`OWNER`, `${schema}`);
    const resultColumns = structureColumns.map((column) => {
      renameObjectKeyName(column, 'DATA_DEFAULT', 'column_default');
      column.NULLABLE = column.NULLABLE === 'Y';
      renameObjectKeyName(column, 'NULLABLE', 'allow_null');
      renameObjectKeyName(column, 'DATA_LENGTH', 'character_maximum_length');
      if (typeof column.column_default === 'string' && column.column_default.includes('SYS_GUID()')) {
        column.extra = 'auto_increment';
      }
      return objectKeysToLowercase(column);
    }) as TableStructureDS[];
    LRUStorage.setTableStructureCache(this.connection, tableName, resultColumns);
    return resultColumns;
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    if (!this.connection.id) {
      this.connection.id = nanoid(6);
    }
    const knex = await this.configureKnex();
    try {
      await knex.transaction((trx) => {
        return knex.raw(`SELECT 1 FROM DUAL`).transacting(trx);
      });
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
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const tableStructure = await this.getTableStructure(tableName);

    const timestampColumnNames = tableStructure
      .filter(({ data_type }) => isOracleTimeType(data_type))
      .map(({ column_name }) => column_name);

    const dateColumnNames = tableStructure
      .filter(({ data_type }) => isOracleDateType(data_type))
      .map(({ column_name }) => column_name);

    Object.keys(row).forEach((key) => {
      if (timestampColumnNames.includes(key) && row[key]) {
        row[key] = this.formatTimestamp(row[key] as string);
      }
      if (dateColumnNames.includes(key) && row[key]) {
        row[key] = this.formatDate(new Date(row[key] as string));
      }
    });

    return await knex(tableName).withSchema(schema).returning(Object.keys(primaryKey)).where(primaryKey).update(row);
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const tableStructure = await this.getTableStructure(tableName);

    const timestampColumnNames = tableStructure
      .filter(({ data_type }) => isOracleTimeType(data_type))
      .map(({ column_name }) => column_name);

    const dateColumnNames = tableStructure
      .filter(({ data_type }) => isOracleDateType(data_type))
      .map(({ column_name }) => column_name);

    // Format date and timestamp fields in newValues
    Object.keys(newValues).forEach((key) => {
      if (timestampColumnNames.includes(key) && newValues[key]) {
        newValues[key] = this.formatTimestamp(newValues[key] as string);
      }
      if (dateColumnNames.includes(key) && newValues[key]) {
        newValues[key] = this.formatDate(new Date(newValues[key] as string));
      }
    });

    return await knex.transaction(async (trx) => {
      const results = [];
      for (const primaryKey of primaryKeys) {
        const result = await trx(tableName)
          .withSchema(schema)
          .returning(Object.keys(primaryKey))
          .where(primaryKey)
          .update(newValues);
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
        .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
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
    const knex = await this.configureKnex();
    const result: Array<ReferencedTableNamesAndColumnsDS> = [];

    await Promise.all(
      primaryColumns.map(async (primaryColumn) => {
        const referencedConstraints: Array<RefererencedConstraint> = (await knex.transaction((trx) => {
          return knex
            .raw(
              `
          SELECT
          UC.TABLE_NAME as TABLE_NAME,
          UC.CONSTRAINT_NAME as CONSTRAINT_NAME,
          UCC.TABLE_NAME as TABLE_NAME_ON,
          UCC.COLUMN_NAME as COLUMN_NAME_ON
          FROM
          USER_CONSTRAINTS UC,
          USER_CONS_COLUMNS UCC
          WHERE
          UC.R_CONSTRAINT_NAME = UCC.CONSTRAINT_NAME
          AND uc.constraint_type = 'R'
          AND UCC.TABLE_NAME = ?
          AND UCC.COLUMN_NAME = ?
          ORDER BY
          UC.TABLE_NAME,
          UC.R_CONSTRAINT_NAME,
          UCC.TABLE_NAME,
          UCC.COLUMN_NAME
          `,
              [tableName, primaryColumn.column_name],
            )
            .transacting(trx);
        })) as Array<RefererencedConstraint>;

        await Promise.all(
          referencedConstraints.map(async (referencedConstraint) => {
            const columnName = await knex.transaction((trx) => {
              return knex
                .raw(
                  `
            SELECT column_name
            FROM all_cons_columns
            WHERE constraint_name = ?
            `,
                  referencedConstraint.CONSTRAINT_NAME,
                )
                .transacting(trx);
            });
            referencedConstraint.CONSTRAINT_NAME = columnName[0].COLUMN_NAME;
          }),
        );

        result.push({
          referenced_on_column_name: primaryColumn.column_name,
          referenced_by: referencedConstraints.map(({ TABLE_NAME, CONSTRAINT_NAME }) => ({
            table_name: TABLE_NAME,
            column_name: CONSTRAINT_NAME,
          })),
        });
      }),
    );

    return result;
  }

  public async isView(tableName: string): Promise<boolean> {
    const knex = await this.configureKnex();
    const schemaName = this.connection.schema ?? this.connection.username.toUpperCase();

    const [result] = await knex.raw(
      `SELECT object_type
       FROM all_objects
       WHERE owner = :schemaName
         AND object_name = :tableName`,
      {
        schemaName,
        tableName,
      },
    );

    if (!result) {
      const errorMessage = ERROR_MESSAGES.TABLE_NOT_FOUND(tableName);
      throw new Error(errorMessage);
    }

    const { OBJECT_TYPE } = result;
    return OBJECT_TYPE === 'VIEW';
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<unknown>> {
    const knex = await this.configureKnex();
    const { page: updatedPage, perPage: updatedPerPage } = this.setupPagination(page, perPage, settings);

    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    const searchedFields =
      settings.search_fields?.length > 0 ? settings.search_fields : searchedFieldValue ? availableFields : undefined;

    const tableSchema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();

    const offset = (updatedPage - 1) * updatedPerPage;

    const { large_dataset } = await this.getRowsCount(knex, tableName, tableSchema);
    if (large_dataset) {
      throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    }

    const rowsAsStream = await knex(tableName)
      .withSchema(tableSchema)
      .select(availableFields)
      .modify((builder) => {
        if (searchedFieldValue && searchedFields?.length > 0) {
          for (const field of searchedFields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` Lower(??) LIKE ?`, [field, `${searchedFieldValue.toLowerCase()}%`]);
            }
          }
        }
      })
      .modify((builder) => {
        if (filteringFields && filteringFields.length > 0) {
          for (const { field, criteria, value } of filteringFields) {
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
        const { ordering_field, ordering } = settings;
        if (ordering_field && ordering) {
          builder.orderBy(ordering_field, ordering);
        }
      })
      .limit(updatedPerPage)
      .offset(offset);

    return rowsAsStream;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const tableSchema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
    const knex = await this.configureKnex();
    const structure = await this.getTableStructure(tableName);
    const timestampColumnNames = structure
      .filter(({ data_type }) => isOracleDateOrTimeType(data_type))
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
            if (row[column] && !isOracleDateStringByRegexp(row[column])) {
              const date = new Date(Number(row[column]));
              row[column] = this.formatDate(date);
            }
          }

          await trx(tableName).withSchema(tableSchema).insert(row);
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

  private setupPagination(page: number, perPage: number, settings: TableSettingsDS) {
    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    }

    const { list_per_page } = settings;
    if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
      perPage = list_per_page;
    } else {
      perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
    }

    return { page, perPage };
  }

  private attachSchemaNameToTableName(tableName: string): string {
    tableName = this.connection.schema
      ? `"${this.connection.schema}"."${tableName}"`
      : `"${this.connection.username.toUpperCase()}"."${tableName}"`;
    return tableName;
  }

  private formatDate(date: Date) {
    if (!date) {
      return date as any;
    }
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear().toString().slice(-2);
    const resultString = `${day}-${monthNames[monthIndex]}-${year}`;
    return resultString;
  }

  private formatTimestamp(timestamp: string | number | Date): string {
    if (!timestamp) {
      return timestamp as any;
    }
    const date = new Date(timestamp);

    const day = `0${date.getDate()}`.slice(-2);
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);

    let hours = date.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = `0${hours}`.slice(-2);

    const minutes = `0${date.getMinutes()}`.slice(-2);
    const seconds = `0${date.getSeconds()}`.slice(-2);

    return `${day}-${month}-${year} ${hoursStr}:${minutes}:${seconds} ${period}`;
  }
}
