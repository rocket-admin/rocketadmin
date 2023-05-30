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
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.addRowInTable,
          tableName: tableName,
          row: row,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.deleteRowInTable,
          tableName: tableName,
          primaryKey: primaryKey,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
    userEmail: string,
  ): Promise<string[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getIdentityColumns,
          tableName: tableName,
          referencedFieldName: referencedFieldName,
          identityColumnName: identityColumnName,
          fieldValues: fieldValues,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getRowByPrimaryKey,
          tableName: tableName,
          primaryKey: primaryKey,
          tableSettings: settings,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      if (Array.isArray(res.data.commandResult)) {
        return res.data.commandResult[0];
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
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
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getRowsFromTable,
          tableName: tableName,
          tableSettings: settings,
          page: page,
          perPage: perPage,
          searchedFieldValue: searchedFieldValue,
          filteringFields: filteringFields,
          autocompleteFields: autocompleteFields,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<ForeignKeyDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getTableForeignKeys,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      const result = res.data.commandResult;
      LRUStorage.setTableForeignKeysCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTablePrimaryColumns(tableName: string, userEmail: string): Promise<PrimaryKeyDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getTablePrimaryColumns,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      const result = res.data.commandResult;
      LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTablesFromDB(userEmail: string): Promise<TableDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getTablesFromDB,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTableStructure(tableName: string, userEmail: string): Promise<TableStructureDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    const cachedTableStructure = LRUStorage.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getTableStructure,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      const result = res.data.commandResult;
      LRUStorage.setTableStructureCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async testConnect(userEmail: string = 'unknown'): Promise<TestConnectionResultDS> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.testConnect,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.updateRowInTable,
          tableName: tableName,
          row: row,
          primaryKey: primaryKey,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async validateSettings(
    settings: ValidateTableSettingsDS,
    tableName: string,
    userEmail: string,
  ): Promise<string[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.validateSettings,
          tableName: tableName,
          tableSettings: settings,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getReferencedTableNamesAndColumns(
    tableName: string,
    userEmail: string,
  ): Promise<ReferencedTableNamesAndColumnsDS[]> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.getReferencedTableNamesAndColumns,
          email: userEmail,
          tableName: tableName,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (!res?.data?.commandResult) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async isView(tableName: string, userEmail: string): Promise<boolean> {
    const jwtAuthToken = this.generateJWT(this.connection.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DataAccessObjectCommandsEnum.isView,
          email: userEmail,
          tableName: tableName,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      if (
        res.data === undefined ||
        res.data === null ||
        res.data.commandResult === null ||
        res.data.commandResult === undefined
      ) {
        throw new Error(ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  private generateJWT(connectionToken: string): string {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);
    const secret = process.env.JWT_SECRET;
    return jwt.sign(
      {
        token: connectionToken,
      },
      secret,
    );
  }

  private checkIsErrorLocalAndThrowException(e: any): void {
    if (e.message === ERROR_MESSAGES.NO_DATA_RETURNED_FROM_AGENT) {
      throw new Error(e.message);
    }
    if (e?.code?.toLowerCase() === 'enotfound' && e?.hostname === 'autoadmin-ws.local') {
      throw new Error(ERROR_MESSAGES.CANT_CONNECT_AUTOADMIN_WS);
    }
  }
}
