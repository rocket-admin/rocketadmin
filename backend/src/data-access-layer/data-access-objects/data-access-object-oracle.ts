import { Injectable, Scope } from '@nestjs/common';
import { Knex } from 'knex';
import { TunnelCreator } from '../../dal/shared/tunnel-creator';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { FilterCriteriaEnum, QueryOrderingEnum } from '../../enums';
import {
  checkFieldAutoincrement,
  compareArrayElements,
  isObjectEmpty,
  listTables,
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
import { getOracleKnex } from '../shared/utils/get-oracle-knex';

@Injectable({ scope: Scope.REQUEST })
export class DataAccessObjectOracle implements IDataAccessObject {
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
    const primaryKey = primaryColumns[0];
    let primaryKeyStructure;

    if (primaryColumns?.length > 0) {
      const primaryKeyIndexInStructure = tableStructure.findIndex((e) => {
        return primaryKey.column_name;
      });
      primaryKeyStructure = tableStructure.at(primaryKeyIndexInStructure);
    }

    const knex = await this.configureKnex();
    const keys = Object.keys(row);
    const values = Object.values(row).map((val) => {
      return `${val}`;
    });

    const primaryKeysInStructure = tableStructure.map((el) => {
      return tableStructure.find((structureEl) => structureEl.column_name === el.column_name);
    });

    const autoIncrementPrimaryKey = primaryKeysInStructure.find((key) =>
      checkFieldAutoincrement(key.column_default, key.extra),
    );

    let result;
    tableName = this.attachSchemaNameToTableName(tableName);
    if (primaryColumns?.length > 0) {
      if (autoIncrementPrimaryKey) {
        await knex
          .transaction((trx) => {
            knex
              .raw(
                `insert INTO ${tableName} (${keys.map((_) => '??').join(', ')})
                 VALUES (${values.map((_) => '?').join(', ')})`,
                [...keys, ...values],
              )
              .transacting(trx)
              .then(trx.commit)
              .catch(trx.rollback);
          })
          .catch((e) => {
            throw new Error(e);
          });
        const queryResult = await knex()
          .select(knex.raw(`${primaryKeyStructure.column_default.replace(/nextval/gi, 'currval')}`))
          .from(knex.raw(`${tableName}`))
          //const queryResult = await knex(tableName).select(knex.raw(`${primaryKeyStructure.column_default.replace(/nextval/gi, 'currval')}`))
          .catch((e) => {
            throw new Error(e);
          });

        const resultObj = {};
        for (const [index, el] of primaryColumns.entries()) {
          resultObj[el.column_name] = queryResult[index]['CURRVAL'].toString();
        }
        result = resultObj;
      } else {
        await knex
          .transaction((trx) => {
            knex
              .raw(
                `insert INTO ${tableName} (${keys.map((_) => '??').join(', ')})
                 VALUES (${values.map((_) => '?').join(', ')})`,
                [...keys, ...values],
              )
              .transacting(trx)
              .then(trx.commit)
              .catch(trx.rollback);
          })
          .catch((e) => {
            throw new Error(e);
          });
        const primaryKeys = primaryColumns.map((column) => column.column_name);
        const resultsArray = [];
        for (let i = 0; i < primaryKeys.length; i++) {
          // eslint-disable-next-line security/detect-object-injection
          resultsArray.push([primaryKeys[i], row[primaryKeys[i]]]);
        }
        result = Object.fromEntries(resultsArray);
      }
    } else {
      result = await knex
        .transaction((trx) => {
          knex
            .raw(
              `insert INTO ${tableName} (${keys.map((_) => '??').join(', ')})
               VALUES (${values.map((_) => '?').join(', ')})`,
              [...keys, ...values],
            )
            .transacting(trx)
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .catch((e) => {
          throw new Error(e);
        });
    }
    return result;
  }

  public async configureKnex(): Promise<Knex> {
    const cachedKnex = Cacher.getCachedKnex(this.connection);
    if (cachedKnex) {
      return cachedKnex;
    }
    if (this.connection.ssh) {
      const newKnex = await TunnelCreator.createTunneledKnex(this.connection);
      Cacher.setKnexCache(this.connection, newKnex);
      return newKnex;
    } else {
      return getOracleKnex(this.connection);
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    return await knex(tableName)
      .withSchema(this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase())
      .where(primaryKey)
      .del();
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
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
    settings: TableSettingsEntity,
  ): Promise<Record<string, unknown>> {
    const knex = await this.configureKnex();
    if (!settings) {
      return (
        await knex(tableName)
          .withSchema(this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase())
          .where(primaryKey)
      )[0] as unknown as Record<string, unknown>;
    } else {
      const availableFields = await this.findAvaliableFields(settings, tableName);
      return (
        await knex(tableName)
          .withSchema(this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase())
          .select(availableFields)
          .where(primaryKey)
      )[0] as unknown as Record<string, unknown>;
    }
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsEntity,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<IFilteringFieldsData>,
    autocompleteFields: IAutocompleteFieldsData,
  ): Promise<IRows> {
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
             FROM ${tableName} ${andWhere ? andWhere : ''} FETCH FIRST ${Constants.AUTOCOMPLETE_ROW_LIMIT} ROWS ONLY `,
            [...autocompleteFields.fields, ...autocompleteFields.fields],
          )
          .transacting(trx)
          .then(trx.commit)
          .catch(trx.rollback);
      });
      return {
        data: rows as unknown as unknown as Array<Record<string, unknown>>,
        pagination: {} as any,
      };
    }

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
    const availableFields = await this.findAvaliableFields(settings, tableName);
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
      orderingField,
      order,
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
      orderingField: string,
      order = QueryOrderingEnum.ASC,
      searchedFields: Array<string>,
      searchedFieldValue: any,
      filteringFields: any,
    ): Promise<any> {
      const offset = (page - 1) * perPage;
      const rows = await knex(tableName)
        .withSchema(tableSchema)
        .select(availableFields)
        .modify((builder) => {
          const search_fields = searchedFields;
          if (searchedFieldValue && search_fields.length > 0) {
            for (const field of search_fields) {
              builder.orWhereRaw(` CAST (?? AS VARCHAR (255))=?`, [field, searchedFieldValue]);
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
      const rowsCount = await getRowsCount(knex, tableName, tableSchema);
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
      };
    }

    async function getRowsCount(knex: Knex, tableName: string, tableSchema: string): Promise<number> {
      async function countWithTimeout() {
        return new Promise(async function (resolve, reject) {
          setTimeout(() => {
            resolve(null);
          }, Constants.COUNT_QUERY_TIMEOUT_MS);
          const count = (await knex(tableName).withSchema(tableSchema).count('*')) as any;
          const rowsCount = parseInt(count[0]['COUNT(*)']);
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
        const secondCount = await knex('ALL_TABLES')
          .select('NUM_ROWS')
          .where('TABLE_NAME', '=', tableName)
          .andWhere('OWNER', '=', tableSchema);
        return secondCount[0]['NUM_ROWS'];
      }
    }
  }

  public async getTableForeignKeys(tableName: string): Promise<Array<IForeignKey>> {
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
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
    const resultKeys = foreignKeys.map((key) => {
      return {
        referenced_column_name: key.R_COLUMN_NAME,
        referenced_table_name: key.R_TABLE_NAME,
        constraint_name: key.CONSTRAINT_NAME,
        column_name: key.COLUMN_NAME,
      };
    });
    Cacher.setTableForeignKeysCache(this.connection, tableName, resultKeys);
    return resultKeys;
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
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
    Cacher.setTablePrimaryKeysCache(this.connection, tableName, primaryColumnsInLowercase);
    return primaryColumnsInLowercase;
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    const knex = await this.configureKnex();
    const schema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
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
    });
    Cacher.setTableStructureCache(this.connection, tableName, resultColumns);
    return resultColumns;
  }

  public async getTablesFromDB(): Promise<Array<string>> {
    const schema = this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase();
    const knex = await this.configureKnex();
    return await listTables(knex, schema);
  }

  public async testConnect(): Promise<ITestConnectResult> {
    const knex = await this.configureKnex();
    let result;
    try {
      result = await knex('DUAL').select(1);
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
      .withSchema(this.connection.schema ? this.connection.schema : this.connection.username.toUpperCase())
      .returning(Object.keys(primaryKey))
      .where(primaryKey)
      .update(row);
  }

  public async validateSettings(settings: CreateTableSettingsDto, tableName: string): Promise<Array<string>> {
    const promisesResults = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    const tableStructure = promisesResults[0];
    const primaryColumns = promisesResults[1];
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  private attachSchemaNameToTableName(tableName: string): string {
    tableName = this.connection.schema
      ? `"${this.connection.schema}"."${tableName}"`
      : `"${this.connection.username.toUpperCase()}"."${tableName}"`;
    return tableName;
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
