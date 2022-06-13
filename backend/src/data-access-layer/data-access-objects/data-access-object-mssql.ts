import { Injectable, Scope } from '@nestjs/common';
import { BasicDao } from '../../dal/shared/basic-dao';
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
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { Knex } from 'knex';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { Cacher } from '../../helpers/cache/cacher';
import { TunnelCreator } from '../../dal/shared/tunnel-creator';
import { getMssqlKnex } from '../shared/utils/get-mssql-knex';

@Injectable({ scope: Scope.REQUEST })
export class DataAccessObjectMssql extends BasicDao implements IDataAccessObject {
  private readonly connection: ConnectionEntity;

  constructor(connection: ConnectionEntity) {
    super();
    this.connection = connection;
  }

  //todo complex keys
  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const knex = await this.configureKnex();
    const primaryColumns = await this.getTablePrimaryColumns(tableName);
    const primaryKey = primaryColumns[0];
    const schemaName = await this.getSchemaName(tableName);
    tableName = `${schemaName}.[${tableName}]`;
    if (primaryColumns?.length > 0) {
      const result = await knex(tableName).returning(primaryKey.column_name).insert(row);
      return {
        [primaryKey.column_name]: result[0],
      };
    } else {
      return (await knex(tableName).insert(row)) as unknown as Record<string, unknown>;
    }
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
      return getMssqlKnex(this.connection);
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve(undefined);
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
    return Promise.resolve(undefined);
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsEntity,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve(undefined);
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
    return Promise.resolve(undefined);
  }

  public async getTableForeignKeys(tableName: string): Promise<Array<IForeignKey>> {
    return Promise.resolve(undefined);
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<IPrimaryKey>> {
    return Promise.resolve(undefined);
  }

  public async getTableStructure(tableName: string): Promise<Array<ITableStructure>> {
    return Promise.resolve(undefined);
  }

  public async getTablesFromDB(email?: string): Promise<Array<string>> {
    return Promise.resolve(undefined);
  }

  public async testConnect(): Promise<ITestConnectResult> {
    return Promise.resolve(undefined);
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve(undefined);
  }

  public async validateSettings(settings: CreateTableSettingsDto, tableName: string): Promise<Array<string>> {
    return Promise.resolve(undefined);
  }

  private async getSchemaName(tableName: string): Promise<string> {
    if (this.connection.schema) {
      return `[${this.connection.schema}]`;
    }
    const knex = await this.configureKnex();
    const queryResult =
      await knex.raw(`SELECT QUOTENAME(SCHEMA_NAME(sOBJ.schema_id)) + '.' + QUOTENAME(sOBJ.name) AS [TableName]
      , SUM(sdmvPTNS.row_count) AS [RowCount]
                      FROM
                          sys.objects AS sOBJ
                          INNER JOIN sys.dm_db_partition_stats AS sdmvPTNS
                      ON sOBJ.object_id = sdmvPTNS.object_id
                      WHERE
                          sOBJ.type = 'U'
                        AND sOBJ.is_ms_shipped = 0x0
                        AND sdmvPTNS.index_id
                          < 2
                      GROUP BY
                          sOBJ.schema_id
                              , sOBJ.name
                      ORDER BY [TableName]`);
    let tableSchema = undefined;
    for (const row of queryResult) {
      if (row.TableName.includes(tableName)) {
        tableSchema = row.TableName.split('.')[0];
      }
    }
    return tableSchema;
  }
}
