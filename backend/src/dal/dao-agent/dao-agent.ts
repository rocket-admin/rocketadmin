import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { CreateTableSettingsDto } from '../../entities/table-settings/dto';
import { DaoCommandsEnum } from '../../enums/dao-commands.enum';
import { IDaoInterface, ITestConnectResult } from '../shared/dao-interface';
import { TableSettingsEntity } from '../../entities/table-settings/table-settings.entity';
import { ConnectionEntity } from '../../entities/connection/connection.entity';

export class DaoAgent implements IDaoInterface {
  private readonly connection: ConnectionEntity;
  private readonly serverAddress: string;
  private readonly cognitoUserName: string;

  constructor(connection: ConnectionEntity, cognitoUserName: string) {
    this.connection = connection;
    this.serverAddress = `http://autoadmin-ws.local:8008/`;
    this.cognitoUserName = cognitoUserName;
  }

  async addRowInTable(tableName: string, row, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.addRowInTable,
          tableName: tableName,
          row: row,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async deleteRowInTable(tableName: string, primaryKey, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.deleteRowInTable,
          tableName: tableName,
          primaryKey: primaryKey,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
    email: string,
  ): Promise<string> {
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
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getRowByPrimaryKey(
    tableName: string,
    primaryKey,
    settings: TableSettingsEntity | Record<string, unknown>,
    email: string,
  ) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getRowByPrimaryKey,
          tableName: tableName,
          primaryKey: primaryKey,
          tableSettings: settings,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getRowsFromTable(
    tableName: string,
    settings: any,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: any,
    autocompleteFields: any,
    email: string,
  ) {
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
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getTableForeignKeys(tableName: string, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTableForeignKeys,
          tableName: tableName,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getTablePrimaryColumns(tableName: string, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTablePrimaryColumns,
          tableName: tableName,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getTablesFromDB(email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      console.log('-> CALLED TRY');
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTablesFromDB,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      console.log('-> res', res);
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async getTableStructure(tableName: string, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.getTableStructure,
          tableName: tableName,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async testConnect(): Promise<ITestConnectResult> {
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
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async updateRowInTable(tableName: string, row, primaryKey, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.updateRowInTable,
          tableName: tableName,
          row: row,
          primaryKey: primaryKey,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
      throw new Error(e.response.data);
    }
  }

  async validateSettings(settings: CreateTableSettingsDto | Record<string, unknown>, tableName, email: string) {
    const jwtAuthToken = this.generateJWT(this.connection.agent.token);
    try {
      const res = await axios.post(
        this.serverAddress,
        {
          operationType: DaoCommandsEnum.validateSettings,
          tableName: tableName,
          tableSettings: settings,
          email: email,
        },
        { headers: { authorization: `Bearer ${jwtAuthToken}` } },
      );
      if (res.data.commandResult instanceof Error) throw new Error(res.data.commandResult.message);
      return res.data.commandResult;
    } catch (e) {
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
}
