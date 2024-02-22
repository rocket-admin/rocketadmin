import { Knex } from 'knex';
import { checkFieldAutoincrement } from '../../helpers/check-field-autoincrement.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
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
import { QueryOrderingEnum } from '../shared/enums/query-ordering.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { LRUStorage } from '../../caching/lru-storage.js';
import { objectKeysToLowercase } from '../../helpers/object-kyes-to-lowercase.js';
import { renameObjectKeyName } from '../../helpers/rename-object-keyname.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { Stream, Readable } from 'node:stream';

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
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);

    const primaryKey = primaryColumns[0];
    let primaryKeyStructure =
      primaryColumns?.length > 0 ? tableStructure.find((e) => e.column_name === primaryKey.column_name) : undefined;

    const knex = await this.configureKnex();
    const keys = Object.keys(row);
    const values = Object.values(row).map((val) => `${val}`);

    const primaryKeysInStructure = tableStructure.filter((el) =>
      tableStructure.some((structureEl) => structureEl.column_name === el.column_name),
    );

    const autoIncrementPrimaryKey = primaryKeysInStructure.find((key) =>
      checkFieldAutoincrement(key.column_default, key.extra),
    );

    let result: Record<string, unknown> | number;
    tableName = this.attachSchemaNameToTableName(tableName);

    const insertRow = async () => {
      try {
        await knex.transaction((trx) =>
          knex
            .raw(
              `insert INTO ${tableName} (${keys.map((_) => '??').join(', ')})
             VALUES (${values.map((_) => '?').join(', ')})`,
              [...keys, ...values],
            )
            .transacting(trx)
            .then(trx.commit)
            .catch(trx.rollback),
        );
      } catch (e) {
        console.error(e);
        throw e;
      }
    };

    if (primaryColumns?.length > 0) {
      if (autoIncrementPrimaryKey) {
        await insertRow();
        const queryResult = await knex()
          .select(knex.raw(`${primaryKeyStructure.column_default.replace(/nextval/gi, 'currval')}`))
          .from(knex.raw(`${tableName}`))
          .catch((e) => {
            console.error(e);
            throw e;
          });

        const resultObj = {};
        for (const [index, el] of primaryColumns.entries()) {
          resultObj[el.column_name] = queryResult[index]['CURRVAL'].toString();
        }
        result = resultObj;
      } else {
        await insertRow();
        const primaryKeys = primaryColumns.map((column) => column.column_name);
        const resultsArray = primaryKeys.map((key) => [key, row[key]]);
        result = Object.fromEntries(resultsArray);
      }
    } else {
      await insertRow();
      result = 1;
    }
    return result;
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
  ): Promise<string[]> {
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
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const knex = await this.configureKnex();
    if (!tableSettings) {
      return (
        await knex(tableName)
          .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
          .where(primaryKey)
      )[0] as unknown as Record<string, unknown>;
    } else {
      const tableStructure = await this.getTableStructure(tableName);
      const availableFields = this.findAvaliableFields(tableSettings, tableStructure);
      return (
        await knex(tableName)
          .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
          .select(availableFields)
          .where(primaryKey)
      )[0] as unknown as Record<string, unknown>;
    }
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
    const knex = await this.configureKnex();

    if (autocompleteFields && autocompleteFields.value && autocompleteFields.fields.length > 0) {
      let andWhere = '';
      for (let i = 0; i < autocompleteFields.fields.length; i++) {
        if (i === 0) {
          andWhere += ` WHERE CAST (?? AS VARCHAR (255)) LIKE '${autocompleteFields.value}%'`;
        } else {
          andWhere += ` OR CAST (?? AS VARCHAR (255)) LIKE '${autocompleteFields.value}%'`;
        }
      }
      tableName = this.attachSchemaNameToTableName(tableName);
      const rows = await knex.transaction((trx) => {
        knex
          .raw(
            `SELECT ${autocompleteFields.fields.map((_) => '??').join(', ')}
             FROM ${tableName} ${andWhere ? andWhere : ''} FETCH FIRST ${
               DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT
             } ROWS ONLY `,
            [...autocompleteFields.fields, ...autocompleteFields.fields],
          )
          .transacting(trx)
          .then(trx.commit)
          .catch(trx.rollback);
      });
      return {
        data: rows as unknown as unknown as Array<Record<string, unknown>>,
        pagination: {} as any,
        large_dataset: false,
      };
    }

    /* eslint-disable */
    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvaliableFields(settings, tableStructure);
    //********** with pagination ************
    let orderingField = undefined;
    let order = undefined;
    let searchedFields = undefined;
    if (settings.search_fields && settings.search_fields.length > 0) {
      searchedFields = settings.search_fields;
    }
    if ((!searchedFields || searchedFields?.length === 0) && searchedFieldValue) {
      searchedFields = availableFields;
    }
    if (settings && settings.ordering_field) {
      orderingField = settings.ordering_field;
    } else {
      orderingField = availableFields[0];
    }
    if (settings.ordering) {
      order = settings.ordering;
    } else {
      order = QueryOrderingEnum.ASC;
    }

    const tableSchema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
    return await newGetAvailableFieldsWithPagination(
      tableName,
      tableSchema,
      page,
      perPage,
      availableFields,
      searchedFields,
      searchedFieldValue,
      filteringFields,
    );

    async function newGetAvailableFieldsWithPagination(
      tableName: string,
      tableSchema: string,
      page: number,
      perPage: number,
      availableFields: Array<string>,
      searchedFields: Array<string>,
      searchedFieldValue: any,
      filteringFields: any,
    ): Promise<FoundRowsDS> {
      const offset = (page - 1) * perPage;
      const rows = await knex(tableName)
        .withSchema(tableSchema)
        .select(availableFields)
        .modify((builder) => {
          const search_fields = searchedFields;
          if (searchedFieldValue && search_fields.length > 0) {
            for (const field of search_fields) {
              if (Buffer.isBuffer(searchedFieldValue)) {
                builder.orWhere(field, '=', searchedFieldValue);
              } else {
                builder.orWhereRaw(` Lower(??) LIKE ?`, [field, `${searchedFieldValue.toLowerCase()}%`]);
                //  builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
        .offset(offset);
      const { rowsCount, large_dataset } = await getRowsCount(knex, tableName, tableSchema);
      const lastPage = Math.ceil(rowsCount / perPage);
      return {
        data: rows.map((row: any) => {
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

    async function getRowsCount(
      knex: Knex<any, any[]>,
      tableName: string,
      tableSchema: string,
    ): Promise<{ rowsCount: number; large_dataset: boolean }> {
      const fastCount = await getFastRowsCount(knex, tableName, tableSchema);
      if (fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
        return { rowsCount: fastCount, large_dataset: true };
      }

      const rowsCount = await slowCountWithTimeOut(knex, tableName, tableSchema);
      return { rowsCount: rowsCount, large_dataset: false };
    }

    async function getFastRowsCount(knex: Knex<any, any[]>, tableName: string, tableSchema: string): Promise<number> {
      const fastCountQueryResult = await knex('ALL_TABLES')
        .select('NUM_ROWS')
        .where('TABLE_NAME', '=', tableName)
        .andWhere('OWNER', '=', tableSchema);
      const fastCount = fastCountQueryResult[0]['NUM_ROWS'];
      return fastCount;
    }

    async function slowCountWithTimeOut(
      knex: Knex<any, any[]>,
      tableName: string,
      tableSchema: string,
    ): Promise<number> {
      const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
      const rowsCount = parseInt(count[0]['COUNT(*)']);
      return rowsCount;
    }
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ?? this.connection.username.toUpperCase();
    const foreignKeys = await knex.raw(
      `SELECT a.constraint_name,
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
         AND a.OWNER = ?`,
      [tableName, schema],
    );
    const resultKeys = foreignKeys.map((key: any) => {
      return {
        referenced_column_name: key.R_COLUMN_NAME,
        referenced_table_name: key.R_TABLE_NAME,
        constraint_name: key.CONSTRAINT_NAME,
        column_name: key.COLUMN_NAME,
      };
    });
    LRUStorage.setTableForeignKeysCache(this.connection, tableName, resultKeys);
    return resultKeys as ForeignKeyDS[];
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
    const primaryColumns = await knex(tableName)
      .select(knex.raw('cols.column_name'))
      .from(knex.raw('all_constraints cons, all_cons_columns cols'))
      .where(
        knex.raw(
          `cols.table_name = ?
      AND cols.owner = ?
      AND cons.constraint_type = 'P'
      AND cons.constraint_name = cols.constraint_name
      AND cons.owner = cols.owner
      `,
          [tableName, schema],
        ),
      );
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
    const structureColumns = await knex()
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
      return objectKeysToLowercase(column);
    }) as TableStructureDS[];
    LRUStorage.setTableStructureCache(this.connection, tableName, resultColumns);
    return resultColumns;
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const knex = await this.configureKnex();
    let result: unknown;
    try {
      result = await knex
        .transaction((trx) => {
          knex.raw(`SELECT 1 FROM DUAL`).transacting(trx).then(trx.commit).catch(trx.rollback);
        })
        .catch((e) => {
          throw new Error(e);
        });
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
    return await knex(tableName)
      .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();

    const primaryKeysNames = Object.keys(primaryKeys[0]);
    const primaryKeysValues = primaryKeys.map((key) => {
      return Object.values(key);
    });

    return await knex(tableName)
      .withSchema(this.connection.schema ?? this.connection.username.toUpperCase())
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
    const result: Array<ReferencedTableNamesAndColumnsDS> = [];
    for (const primaryColumn of primaryColumns) {
      const referencedConstraints: Array<RefererencedConstraint> = (await knex
        .transaction((trx) => {
          knex
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
            .transacting(trx)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .catch((e) => {
          throw new Error(e);
        })) as Array<RefererencedConstraint>;

      for (const referencedConstraint of referencedConstraints) {
        const columnName = await knex
          .transaction((trx) => {
            knex
              .raw(
                `
            SELECT column_name
            FROM all_cons_columns
            WHERE constraint_name = ?
            `,
                referencedConstraint.CONSTRAINT_NAME,
              )
              .transacting(trx)
              .then(trx.commit)
              .catch(trx.rollback);
          })
          .catch((e) => {
            throw new Error(e);
          });
        referencedConstraint.CONSTRAINT_NAME = columnName[0].COLUMN_NAME;
      }
      result.push({
        referenced_on_column_name: primaryColumn.column_name,
        referenced_by: referencedConstraints.map((constraint) => {
          return {
            table_name: constraint.TABLE_NAME,
            column_name: constraint.CONSTRAINT_NAME,
          };
        }),
      });
    }

    return result;
  }

  public async isView(tableName: string): Promise<boolean> {
    const knex = await this.configureKnex();
    const schemaName = this.connection.schema ?? this.connection.username.toUpperCase();
    const result = await knex.raw(
      `SELECT object_type
       FROM all_objects
       WHERE owner = :schemaName
         AND object_name = :tableName`,
      {
        schemaName,
        tableName,
      },
    );
    if (result.length === 0) {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND(tableName));
    }
    return result[0].OBJECT_TYPE === 'VIEW';
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

    if (!page || page <= 0) {
      page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
      const { list_per_page } = settings;
      if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
        perPage = list_per_page;
      } else {
        perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
      }
    }
    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvaliableFields(settings, tableStructure);

    let orderingField = undefined;
    let order = undefined;
    let searchedFields = undefined;
    if (settings.search_fields && settings.search_fields.length > 0) {
      searchedFields = settings.search_fields;
    }
    if ((!searchedFields || searchedFields?.length === 0) && searchedFieldValue) {
      searchedFields = availableFields;
    }
    if (settings && settings.ordering_field) {
      orderingField = settings.ordering_field;
    } else {
      orderingField = availableFields[0];
    }
    if (settings.ordering) {
      order = settings.ordering;
    } else {
      order = QueryOrderingEnum.ASC;
    }

    const tableSchema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();

    const offset = (page - 1) * perPage;

    const { large_dataset } = await getRowsCount(knex, tableName, tableSchema);
    if (large_dataset) {
      throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
    }

    const rowsAsStream = await knex(tableName)
      .withSchema(tableSchema)
      .select(availableFields)
      .modify((builder) => {
        const search_fields = searchedFields;
        if (searchedFieldValue && search_fields.length > 0) {
          for (const field of search_fields) {
            if (Buffer.isBuffer(searchedFieldValue)) {
              builder.orWhere(field, '=', searchedFieldValue);
            } else {
              builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
      .offset(offset);

    return rowsAsStream;

    async function getRowsCount(
      knex: Knex<any, any[]>,
      tableName: string,
      tableSchema: string,
    ): Promise<{ rowsCount: number; large_dataset: boolean }> {
      const fastCountQueryResult = await knex('ALL_TABLES')
        .select('NUM_ROWS')
        .where('TABLE_NAME', '=', tableName)
        .andWhere('OWNER', '=', tableSchema);
      const fastCount = fastCountQueryResult[0]['NUM_ROWS'];
      if (fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
        return { rowsCount: fastCount, large_dataset: true };
      }
      const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
      const rowsCount = parseInt(count[0]['COUNT(*)']);
      return { rowsCount: rowsCount, large_dataset: false };
    }
  }

  private objectToStream(obj: any): Readable {
    const stream = new Readable({
      objectMode: true,
      read() {
        this.push(obj);
        this.push(null);
      },
    });

    return stream;
  }

  private attachSchemaNameToTableName(tableName: string): string {
    tableName = this.connection.schema
      ? `"${this.connection.schema}"."${tableName}"`
      : `"${this.connection.username.toUpperCase()}"."${tableName}"`;
    return tableName;
  }
}
