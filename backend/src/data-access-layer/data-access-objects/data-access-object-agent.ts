import { Injectable, Scope } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { ConnectionEntity } from '../../entities/connection/connection.entity';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { DaoCommandsEnum } from '../../enums/dao-commands.enum';
import { Messages } from '../../exceptions/text/messages';
import { Cacher } from '../../helpers/cache/cacher';
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

@Injectable({ scope: Scope.REQUEST })
export class DataAccessObjectAgent implements IDataAccessObject {
  private readonly connection: ConnectionEntity;
  private readonly serverAddress: string;
  private readonly cognitoUserName: string;

  constructor(connection: ConnectionEntity, cognitoUserName: string) {
    this.connection = connection;
    this.serverAddress = `http://autoadmin-ws.local:8008/`;
    this.cognitoUserName = cognitoUserName;
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown> | number> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.addRowInTable,
          tableName: tableName,
          row: row,
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

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.deleteRowInTable,
          tableName: tableName,
          primaryKey: primaryKey,
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

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<Array<string>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getIdentityColumns,
          tableName: tableName,
          referencedFieldName: referencedFieldName,
          identityColumnName: identityColumnName,
          fieldValues: fieldValues,
          email: email,
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

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsEntity,
    userEmail: string,
  ): Promise<Record<string, unknown>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getRowByPrimaryKey,
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
      return res.data.commandResult[0];
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
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
    userEmail: string,
  ): Promise<IRows> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getRowsFromTable,
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
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTableForeignKeys(tableName: string, userEmail: string): Promise<Array<IForeignKey>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    const cachedForeignKeys = Cacher.getTableForeignKeysCache(this.connection, tableName);
    if (cachedForeignKeys) {
      return cachedForeignKeys;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTableForeignKeys,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      const result = res.data.commandResult;
      Cacher.setTableForeignKeysCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTablePrimaryColumns(tableName: string, userEmail: string): Promise<Array<IPrimaryKey>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    const cachedPrimaryColumns = Cacher.getTablePrimaryKeysCache(this.connection, tableName);
    if (cachedPrimaryColumns) {
      return cachedPrimaryColumns;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTablePrimaryColumns,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      const result = res.data.commandResult;
      Cacher.setTablePrimaryKeysCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTableStructure(tableName: string, userEmail: string): Promise<Array<ITableStructure>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    const cachedTableStructure = Cacher.getTableStructureCache(this.connection, tableName);
    if (cachedTableStructure) {
      return cachedTableStructure;
    }
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTableStructure,
          tableName: tableName,
          email: userEmail,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      const result = res.data.commandResult;
      Cacher.setTableStructureCache(this.connection, tableName, result);
      return result;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async getTablesFromDB(email?: string): Promise<Array<string>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTablesFromDB,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      console.log('STATUS ', res.status);
      if (res.data.commandResult instanceof Error) {
        throw new Error(res.data.commandResult.message);
      }
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async testConnect(): Promise<ITestConnectResult> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.testConnect,
          email: 'unknown',
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
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.updateRowInTable,
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
      return res.data.commandResult;
    } catch (e) {
      this.checkIsErrorLocalAndThrowException(e);
      throw new Error(e.response.data);
    }
  }

  public async validateSettings(
    settings: CreateTableSettingsDto,
    tableName: string,
    userEmail: string,
  ): Promise<Array<string>> {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.validateSettings,
          tableName: tableName,
          tableSettings: settings,
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

  private checkIsErrorLocalAndThrowException(e: any): void {
    if (e.code.toLowerCase() === 'enotfound' && e.hostname === 'autoadmin-ws.local') {
      throw new Error(Messages.CANT_CONNECT_AUTOADMIN_WS);
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
}
