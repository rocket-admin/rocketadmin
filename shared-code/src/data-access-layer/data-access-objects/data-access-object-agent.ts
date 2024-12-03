/* eslint-disable security/detect-object-injection */
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionAgentParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { IDataAccessObjectAgent } from '../shared/interfaces/data-access-object-agent.interface.js';
import { DataAccessObjectCommandsEnum } from '../shared/enums/data-access-object-commands.enum.js';
import { LRUStorage } from '../../caching/lru-storage.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { Stream, Readable } from 'node:stream';
import * as csv from 'csv';
import PQueue from 'p-queue';
import {
  formatOracleDate,
  isMSSQLDateOrTimeType,
  isMSSQLDateStringByRegexp,
  isMySQLDateStringByRegexp,
  isMySqlDateOrTimeType,
  isOracleDateStringByRegexp,
  isPostgresDateOrTimeType,
  isPostgresDateStringByRegexp,
} from '../../helpers/is-database-date.js';
import { ConnectionTypesEnum } from '../shared/enums/connection-types-enum.js';

export class DataAccessObjectAgent implements IDataAccessObjectAgent {
  private readonly connection: ConnectionAgentParams;
  private readonly serverAddress: string = process.env.LOCAL_WS_SERVER_ADDRESS || `http://autoadmin-ws.local:8008/`;
  constructor(connection: ConnectionAgentParams) {
    this.connection = connection;
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    userEmail: string,
  ): Promise<number | Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.addRowInTable,
        tableName,
        row,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.deleteRowInTable,
        tableName,
        primaryKey,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
    userEmail: string,
  ): Promise<Array<Record<string, unknown>>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getIdentityColumns,
        tableName,
        referencedFieldName,
        identityColumnName,
        fieldValues,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getRowByPrimaryKey,
        tableName,
        primaryKey,
        tableSettings: settings,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      if (Array.isArray(commandResult)) {
        return commandResult[0];
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
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
    userEmail: string,
  ): Promise<FoundRowsDS> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getRowsFromTable,
        tableName,
        tableSettings: settings,
        page,
        perPage,
        searchedFieldValue,
        filteringFields,
        autocompleteFields,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<ForeignKeyDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getTableForeignKeys,
        tableName,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      LRUStorage.setTableForeignKeysCache(this.connection, tableName, commandResult);
      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getTablePrimaryColumns(tableName: string, userEmail: string): Promise<PrimaryKeyDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getTablePrimaryColumns,
        tableName,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, commandResult);
      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getTablesFromDB(userEmail: string): Promise<TableDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getTablesFromDB,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getTableStructure(tableName: string, userEmail: string): Promise<TableStructureDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getTableStructure,
        tableName,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      LRUStorage.setTableStructureCache(this.connection, tableName, commandResult);
      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async testConnect(userEmail: string = 'unknown'): Promise<TestConnectionResultDS> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.testConnect,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.updateRowInTable,
        tableName,
        row,
        primaryKey,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.bulkUpdateRowsInTable,
        tableName,
        row: newValues,
        primaryKey: primaryKeys,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async validateSettings(
    settings: ValidateTableSettingsDS,
    tableName: string,
    userEmail: string,
  ): Promise<string[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.validateSettings,
        tableName,
        tableSettings: settings,
        email: userEmail,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getReferencedTableNamesAndColumns(
    tableName: string,
    userEmail: string,
  ): Promise<ReferencedTableNamesAndColumnsDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getReferencedTableNamesAndColumns,
        email: userEmail,
        tableName,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async isView(tableName: string, userEmail: string): Promise<boolean> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.isView,
        email: userEmail,
        tableName,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (commandResult === null || commandResult === undefined) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<never>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.getRowsAsStream,
        tableName,
        tableSettings: settings,
        page,
        perPage,
        searchedFieldValue,
        filteringFields,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult?.data;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string, userEmail: string): Promise<void> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;
    try {
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      const parser = stream.pipe(csv.parse({ columns: true }));
      const rows: any[] = [];
      for await (const record of parser) {
        rows.push(record);
      }
      const rowsWithProcessedDates = await this.processTimeColumnsInRows(rows, tableName, userEmail);
      const queue = new PQueue({ concurrency: 3 });
      await Promise.all(
        rowsWithProcessedDates.map(async (row) => {
          return await queue.add(async () => {
            return await this.addRowInTable(tableName, row, userEmail);
          });
        }),
      );
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  public async executeRawQuery(query: string, tableName: string, userEmail: string): Promise<Array<Record<string, unknown>>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtAuthToken}`;

    try {
      const { data: { commandResult } = {} } = await axios.post(this.serverAddress, {
        operationType: DataAccessObjectCommandsEnum.executeRawQuery,
        query,
        email: userEmail,
        tableName,
      });

      if (commandResult instanceof Error) {
        throw new Error(commandResult.message);
      }

      if (!commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }

      return commandResult?.data;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.checkIsErrorLocalAndThrowException(e);
        throw new Error(e.response?.data);
      }
      throw e;
    }
  }

  private generateJWT(connectionToken: string): string {
    const exp = new Date();
    exp.setDate(exp.getDate() + 60);
    const secret = process.env.JWT_SECRET;
    return jwt.sign(
      {
        token: connectionToken,
        exp: Math.floor(exp.getTime() / 1000),
      },
      secret,
    );
  }

  private checkIsErrorLocalAndThrowException(e: Error & { code?: string; hostname?: string }): void {
    if (e?.message === ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT) {
      throw new Error(e.message);
    }
    if (e?.code?.toLowerCase() === 'enotfound' && e?.hostname === 'autoadmin-ws.local') {
      throw new Error(ERROR_MESSAGES.CANT_CONNECT_AUTOADMIN_WS);
    }
  }

  private async processTimeColumnsInRows(
    rows: Array<Record<string, unknown>>,
    tableName: string,
    userEmail: string,
  ): Promise<Array<Record<string, unknown>>> {
    const tableStructure = await this.getTableStructure(tableName, userEmail);
    switch (this.connection.type) {
      case ConnectionTypesEnum.agent_postgres:
        const timestampColumnNamesPg = tableStructure
          .filter((column) => {
            return isPostgresDateOrTimeType(column.data_type);
          })
          .map((column) => {
            return column.column_name;
          });
        return this.processPostgresDateColumnsInRows(rows, timestampColumnNamesPg);

      case ConnectionTypesEnum.agent_mysql:
        const timestampColumnNamesMySQL = tableStructure
          .filter((column) => {
            return isMySqlDateOrTimeType(column.data_type);
          })
          .map((column) => {
            return column.column_name;
          });
        return this.processMySQLDateColumnsInRows(rows, timestampColumnNamesMySQL);

      case ConnectionTypesEnum.agent_mssql:
        const timestampColumnNamesMSSQL = tableStructure
          .filter((column) => {
            return isMSSQLDateOrTimeType(column.data_type);
          })
          .map((column) => {
            return column.column_name;
          });
        return this.processMSSQLDateColumnsInRows(rows, timestampColumnNamesMSSQL);

      case ConnectionTypesEnum.agent_oracledb:
        const timestampColumnNamesOracle = tableStructure
          .filter((column) => {
            return isOracleDateStringByRegexp(column.data_type);
          })
          .map((column) => {
            return column.column_name;
          });
        return this.processOracleDateColumnsInRows(rows, timestampColumnNamesOracle);
      default:
        return rows;
    }
  }

  private processOracleDateColumnsInRows(
    rows: Array<Record<string, any>>,
    timestampColumnNames: Array<string>,
  ): Array<Record<string, unknown>> {
    for (const row of rows) {
      for (const column of timestampColumnNames) {
        if (row[column] && !isOracleDateStringByRegexp(row[column])) {
          const date = new Date(Number(row[column]));
          row[column] = formatOracleDate(date);
        }
      }
    }
    return rows;
  }

  private processMySQLDateColumnsInRows(
    rows: Array<Record<string, any>>,
    timestampColumnNames: Array<string>,
  ): Array<Record<string, unknown>> {
    for (const row of rows) {
      for (const column of timestampColumnNames) {
        if (row[column] && !isMySQLDateStringByRegexp(row[column])) {
          let dateStr = row[column];
          if (dateStr.endsWith('Z')) {
            dateStr = dateStr.slice(0, -1);
          }
          const date = new Date(dateStr);
          const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
          row[column] = formattedDate;
        }
      }
    }
    return rows;
  }

  private processMSSQLDateColumnsInRows(rows: Array<Record<string, any>>, timestampColumnNames: Array<string>) {
    for (const row of rows) {
      for (const column of timestampColumnNames) {
        if (row[column] && !isMSSQLDateStringByRegexp(row[column])) {
          const date = new Date(Number(row[column]));
          row[column] = date.toISOString();
        }
      }
    }
    return rows;
  }

  private processPostgresDateColumnsInRows(
    rows: Array<Record<string, any>>,
    timestampColumnNames: Array<string>,
  ): Array<Record<string, unknown>> {
    for (const row of rows) {
      for (const column of timestampColumnNames) {
        try {
          if (row[column] && !isPostgresDateStringByRegexp(row[column])) {
            const date = new Date(Number(row[column]));
            row[column] = date.toISOString();
          }
        } catch (_error) {
          continue;
        }
      }
    }
    return rows;
  }
}
