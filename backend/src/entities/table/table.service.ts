import * as winston from 'winston';
import * as sjson from 'secure-json-parse';
import { ConnectionEntity } from '../connection/connection.entity';
import { createDao } from '../../dal/shared/create-dao';
import { CreateTableSettingsDto } from '../table-settings/dto';
import { Encryptor } from '../../helpers/encryption/encryptor';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getRepository, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Messages } from '../../exceptions/text/messages';
import { stringify as uuidStringify } from 'uuid';
import { TableSettingsEntity } from '../table-settings/table-settings.entity';
import {
  binaryToHex,
  checkFieldAutoincrement,
  compareArrayElements,
  getPropertyValueByDescriptor,
  getValuesBetweenCurlies,
  isBinary,
  isConnectionTypeAgent,
  isObjectEmpty,
  replaceTextInCurlies,
  toPrettyErrorsMsg,
} from '../../helpers';
import {
  IAutocompleteFields,
  IFilteringFields,
  IForeignKeyInfo,
  IForeignKeyStructure,
  IOrderingField,
  IStructureRO,
  ITableRowRO,
  ITableRowsRO,
  ITablesWithTableAccessLevel,
} from './table.interface';
import {
  AccessLevelEnum,
  AmplitudeEventTypeEnum,
  FilterCriteriaEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  PermissionTypeEnum,
  QueryOrderingEnum,
  WidgetTypeEnum,
} from '../../enums';
import { IPasswordWidgetParams } from '../widget/table-widget.interface';
import { Constants } from '../../helpers/constants/constants';
import { IDaoInterface, IPrimaryKeyInfo } from '../../dal/shared/dao-interface';
import { TableWidgetEntity } from '../widget/table-widget.entity';
import { AmplitudeService } from '../amplitude/amplitude.service';
import { ConnectionPropertiesEntity } from '../connection-properties/connection-properties.entity';
import { ITablePermissionData } from '../permission/permission.interface';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { CreatedLogRecordDs } from '../table-logs/application/data-structures/created-log-record.ds';
import { CreateLogRecordDs } from '../table-logs/application/data-structures/create-log-record.ds';
import { UserEntity } from '../user/user.entity';
import { buildTableLogsEntity } from '../table-logs/utils/build-table-logs-entity';
import { buildCreatedLogRecord } from '../table-logs/utils/build-created-log-record';
import { PermissionEntity } from '../permission/permission.entity';
import { CustomFieldsEntity } from '../custom-field/custom-fields.entity';
import { isTestConnectionById } from '../connection/utils/is-test-connection-util';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(ConnectionEntity)
    private readonly connectionRepository: Repository<ConnectionEntity>,
    private readonly amplitudeService: AmplitudeService,
    @InjectRepository(TableLogsEntity)
    private readonly tableLogsRepository: Repository<TableLogsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private readonly logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  async addRowInTable(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    row: string,
    masterPwd: string,
  ): Promise<ITableRowRO | boolean> {
    const connection = await this.findConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let operationResult = OperationResultStatusEnum.unknown;
    const errors = await this.validateRow(cognitoUserName, connection, tableName, row, masterPwd);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }
    try {
      row = await this.hashPasswordsInRow(row, connectionId, tableName);
      row = await this.processUUIDsInRow(row, connectionId, tableName);
      const result = await dao.addRowInTable(tableName, row, userEmail);
      if (result && !isObjectEmpty(result)) {
        operationResult = OperationResultStatusEnum.successfully;
        const addedRow = await this.getRowByPrimaryKeyPrivate(
          cognitoUserName,
          connection,
          tableName,
          result,
          masterPwd,
        );
        addedRow.row = (await this.removePasswordsFromRows([addedRow.row], connectionId, tableName))[0];
        return addedRow;
      }
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: e.message.includes('duplicate key value')
            ? Messages.CANT_INSERT_DUPLICATE_KEY
            : `${Messages.FAILED_ADD_ROW_IN_TABLE}
         ${Messages.ERROR_MESSAGE} ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: cognitoUserName,
        connection: connection,
        operationType: LogOperationTypeEnum.addRow,
        operationStatusResult: operationResult,
        row: row,
      };
      await this.createLogRecord(logRecord);
      // await this.tableLogsService.createLogRecord(logRecord);
      const isTest = await this.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
        cognitoUserName,
      );
    }
  }

  async deleteRowInTable(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    primaryKey: any,
    masterPwd: string,
  ): Promise<any> {
    let operationResult = OperationResultStatusEnum.unknown;
    const errors = [];
    if (!primaryKey) {
      errors.push(Messages.PRIMARY_KEY_MISSING);
    }
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const connection = await this.findConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dao = createDao(connection, cognitoUserName);

    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }

    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);

    const columnNames = [];
    for (let i = 0; i < primaryColumns.length; i++) {
      if (primaryColumns.at(i)['attname']) {
        columnNames.push(primaryColumns.at(i)['attname']);
      }
      if (primaryColumns.at(i)['column_name']) {
        columnNames.push(primaryColumns.at(i)['column_name']);
      }
    }
    const avaliablePrimaryColumns = [];
    for (const primaryColumn of primaryColumns) {
      avaliablePrimaryColumns.push(primaryColumn.column_name);
    }
    for (const key in primaryKey) {
      // eslint-disable-next-line security/detect-object-injection
      if (!primaryKey[key]) delete primaryKey[key];
    }
    const receivedPrimaryColumns = Object.keys(primaryKey);

    if (!compareArrayElements(avaliablePrimaryColumns, receivedPrimaryColumns)) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const oldRowData = await this.getRowByPrimaryKeyPrivate(
      cognitoUserName,
      connection,
      tableName,
      primaryKey,
      masterPwd,
    );
    try {
      await dao.deleteRowInTable(tableName, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      return oldRowData;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: `${Messages.DELETE_ROW_FAILED} ${Messages.ERROR_MESSAGE} "${e.message}"
          ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: cognitoUserName,
        connection: connection,
        operationType: LogOperationTypeEnum.deleteRow,
        operationStatusResult: operationResult,
        row: primaryKey,
        old_data: oldRowData,
      };
      await this.createLogRecord(logRecord);
      const isTest = await this.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowDeletedTest : AmplitudeEventTypeEnum.tableRowDeleted,
        cognitoUserName,
      );
    }
  }

  async findAllRows(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    page: number,
    perPage: number,
    searchingFieldValue: string,
    query: string,
    masterPwd: string,
  ): Promise<ITableRowsRO> {
    const connection = await this.findConnection(connectionId, masterPwd);

    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dao = createDao(connection, cognitoUserName);

    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }

    let operationResult = OperationResultStatusEnum.unknown;
    try {
      const promiseResults = await Promise.all([
        this.getTableStructure(cognitoUserName, connectionId, tableName, masterPwd),
        this.findTableSettingsOrReturnEmpty(connectionId, tableName),
      ]);
      const structure = promiseResults[0];
      let tableSettings = promiseResults[1];

      const { primaryColumns, foreignKeys } = structure;

      const secondPromiseResults = await Promise.all([
        this.findFilteringFields(query, structure),
        dao.validateSettings(tableSettings, tableName, userEmail),
        this.findOrderingField(query, structure, tableSettings),
        this.findAllTableWidgetsWithoutPermissions(connection.id, tableName),
      ]);

      const filteringFields = secondPromiseResults[0];
      const errors = secondPromiseResults[1];
      const orderingField = secondPromiseResults[2];
      const widgets: Array<TableWidgetEntity> = secondPromiseResults[3];

      let configured = false;

      if (errors.length > 0) {
        tableSettings = {};
      }
      if (tableSettings && !isObjectEmpty(tableSettings)) {
        configured = true;
      }

      if (orderingField) {
        tableSettings.ordering_field = orderingField.field;
        tableSettings.ordering = orderingField.value;
      }

      let autocompleteFields = undefined;
      const autocomplete = query['autocomplete'];
      const referencedColumn = query['referencedColumn'];
      if (autocomplete !== undefined && referencedColumn !== undefined) {
        autocompleteFields = await this.findAutocompleteFields(query, structure, tableSettings, referencedColumn);
      }
      let rows = await dao.getRowsFromTable(
        tableName,
        tableSettings,
        page,
        perPage,
        searchingFieldValue,
        filteringFields,
        autocompleteFields,
        userEmail,
      );
      rows = await this.addCustomFieldsIntoTableRows(rows, connectionId, tableName, structure);
      rows = this.convertBinaryDataInRows(rows, structure);
      rows.data = await this.removePasswordsFromRows(rows.data, connectionId, tableName);

      delete rows.pagination.from;
      delete rows.pagination.to;

      if (foreignKeys && foreignKeys.length > 0) {
        await Promise.all(
          foreignKeys.map((el) => {
            try {
              this.attachForeignColumnNames(el, cognitoUserName, connectionId, masterPwd);
            } catch (e) {
              console.log('-> e', e);
              return el;
            }
          }),
        );
      }

      rows.pagination.total = parseInt(rows.pagination.total);
      operationResult = OperationResultStatusEnum.successfully;
      const rowsRO = {
        rows: rows.data,
        primaryColumns: primaryColumns,
        pagination: rows.pagination,
        /* eslint-disable */
        sortable_by: tableSettings?.sortable_by?.length > 0 ? tableSettings.sortable_by : [],
        ordering_field: tableSettings.ordering_field ? tableSettings.ordering_field : undefined,
        ordering: tableSettings.ordering ? tableSettings.ordering : undefined,
        columns_view: tableSettings.columns_view ? tableSettings.columns_view : undefined,
        structure: structure.structure,
        foreignKeys: foreignKeys,
        configured: configured,
        widgets: widgets,
        identity_column: tableSettings.identity_column ? tableSettings.identity_column : null,
      };

      let identities = [];

      if (foreignKeys && foreignKeys.length > 0) {
        identities = await Promise.all(
          foreignKeys.map(async (foreignKey) => {
            const foreignKeysValuesCollection = [];
            for (const row of rowsRO.rows) {
              if (row[foreignKey.column_name]) {
                foreignKeysValuesCollection.push(row[foreignKey.column_name]);
              }
            }
            const foreignTableSettings = await this.findTableSettingsOrReturnEmpty(
              connectionId,
              foreignKey.referenced_table_name,
            );
            const identityColumns = await dao.getIdentityColumns(
              foreignKey.referenced_table_name,
              foreignKey.referenced_column_name,
              foreignTableSettings.identity_column ? foreignTableSettings.identity_column : undefined,
              foreignKeysValuesCollection,
              userEmail,
            );
            return {
              referenced_table_name: foreignKey.referenced_table_name,
              identity_columns: identityColumns,
            };
          }),
        );
      }

      const foreignKeysConformity = [];

      for (const key of foreignKeys) {
        foreignKeysConformity.push({
          currentFKeyName: key.column_name,
          realFKeyName: key.referenced_column_name,
          referenced_table_name: key.referenced_table_name,
        });
      }
      for (const element of foreignKeysConformity) {
        const foundIdentityForCurrentTable = identities.find(
          (el) => el.referenced_table_name === element.referenced_table_name,
        );
        for (const row of rowsRO.rows) {
          const foundIdentityForCurrentValue = foundIdentityForCurrentTable?.identity_columns.find(
            (el) => el[element.realFKeyName] === row[element.currentFKeyName],
          );
          const newFKeyObj = {};
          if (foundIdentityForCurrentValue) {
            for (const key of Object.keys(foundIdentityForCurrentValue)) {
              newFKeyObj[key] = foundIdentityForCurrentValue[key];
            }
          }
          row[element.currentFKeyName] = newFKeyObj;
        }
      }

      return rowsRO;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLE_ROWS} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: cognitoUserName,
        connection: connection,
        operationType: LogOperationTypeEnum.rowsReceived,
        operationStatusResult: operationResult,
      };
      await this.createLogRecord(logRecord);
      const isTest = await this.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowsReceivedTest : AmplitudeEventTypeEnum.tableRowsReceived,
        cognitoUserName,
      );
    }
  }

  async findTablesInConnection(
    cognitoUserName: string,
    connectionId: string,
    masterPwd: string,
    hiddenTablesOption = false,
  ): Promise<Array<ITablesWithTableAccessLevel>> {
    const connection = await this.findConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }

    let tables;
    try {
      tables = await dao.getTablesFromDB(userEmail);
    } catch (e) {
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLES} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      if (!connection.isTestConnection) {
        this.logger.info({
          tables: tables,
          connectionId: connectionId,
          connectionType: connection.type,
        });
      }
      const isTest = await this.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableListReceivedTest : AmplitudeEventTypeEnum.tableListReceived,
        cognitoUserName,
        { tablesCount: tables?.length ? tables.length : 0 },
      );
    }
    const tablesWithPermissions = await this.getUserPermissionsForAvailableTables(
      cognitoUserName,
      connectionId,
      tables,
    );
    let tablesRO = await this.addDisplayNamesIntoTablesArr(connectionId, tablesWithPermissions);

    const excludedTables: ConnectionPropertiesEntity = await this.findConnectionProperties(connectionId);
    if (excludedTables && excludedTables.hidden_tables.length > 0) {
      if (!hiddenTablesOption) {
        tablesRO = tablesRO.filter((tableRO) => {
          return !excludedTables.hidden_tables.includes(tableRO.table);
        });
      } else {
        const userConnectionEdit = await this.checkUserConnectionEdit(cognitoUserName, connectionId);
        if (!userConnectionEdit) {
          throw new HttpException(
            {
              message: Messages.DONT_HAVE_PERMISSIONS,
            },
            HttpStatus.FORBIDDEN,
          );
        }
      }
    }
    return tablesRO.sort((tableRO1, tableRO2) => {
      const display_name1 = tableRO1.display_name;
      const display_name2 = tableRO2.display_name;
      if (display_name1 && display_name2) {
        return display_name1.localeCompare(display_name2);
      }
      if (!display_name1 && !display_name2) {
        return tableRO1.table.localeCompare(tableRO2.table);
      }
      if (!display_name1 && display_name2) {
        return tableRO1.table.localeCompare(display_name2);
      }
      if (display_name1 && !display_name2) {
        return display_name1.localeCompare(tableRO2.table);
      }
      return 0;
    });
  }

  async getRowByPrimaryKey(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    primaryKey: any,
    masterPwd: string,
    calledInController = false,
  ): Promise<ITableRowRO> {
    const errors = [];
    if (!primaryKey) {
      errors.push(Messages.PRIMARY_KEY_MISSING);
    }

    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const connection = await this.findConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dao = createDao(connection, cognitoUserName);

    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }

    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);

    const avaliablePrimaryColumns = [];
    for (const primaryColumn of primaryColumns) {
      avaliablePrimaryColumns.push(primaryColumn.column_name);
    }
    for (const key in primaryKey) {
      if (!primaryKey[key]) delete primaryKey[key];
    }
    const receivedPrimaryColumns = Object.keys(primaryKey);
    if (!compareArrayElements(avaliablePrimaryColumns, receivedPrimaryColumns)) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    let operationResult = OperationResultStatusEnum.unknown;
    let result;
    try {
      operationResult = OperationResultStatusEnum.successfully;
      result = await this.getRowByPrimaryKeyPrivate(cognitoUserName, connection, tableName, primaryKey, masterPwd);
      return result;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw e;
    } finally {
      if (calledInController) {
        const logRecord = {
          table_name: tableName,
          userId: cognitoUserName,
          connection: connection,
          operationType: LogOperationTypeEnum.rowReceived,
          operationStatusResult: operationResult,
          row: result?.row ? result.row : null,
        };
        await this.createLogRecord(logRecord);
      }
    }
  }

  async getTableStructure(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    masterPwd: string,
  ): Promise<IStructureRO> {
    const connection = await this.findConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }

    try {
      const promiseResults = await Promise.all([
        this.findTableSettingsOrReturnEmpty(connectionId, tableName),
        dao.getTablePrimaryColumns(tableName, userEmail),
        dao.getTableStructure(tableName, userEmail),
        this.findAllTableWidgetsWithoutPermissions(connectionId, tableName),
      ]);

      let tableSettings = promiseResults[0];
      const primaryColumns = promiseResults[1];
      const structure = promiseResults[2];
      const tableWidgets = promiseResults[3];

      const errors = await dao.validateSettings(tableSettings, tableName, userEmail);
      if (errors.length > 0) {
        tableSettings = {};
      }
      const fullStructure = [];
      /* eslint-disable */
      const { search_fields, excluded_fields, readonly_fields } = tableSettings;
      for (const element of structure) {
        const { column_name, column_default, data_type, data_type_params, allow_null, character_maximum_length } =
          element;
        const indexSearch = search_fields?.indexOf(column_name);
        const indexExclude = excluded_fields?.indexOf(column_name);
        fullStructure.push({
          column_name: column_name,
          column_default: column_default,
          data_type: data_type,
          data_type_params: data_type_params ? data_type_params : undefined,
          isExcluded: indexExclude >= 0,
          isSearched: indexSearch >= 0,
          auto_increment: checkFieldAutoincrement(column_default),
          allow_null: allow_null,
          character_maximum_length: character_maximum_length,
        });
      }
      /* eslint-enable */
      // const foreignKeys = await dao.getTableForeignKeys(tableName);
      const foreignKeys = await this.getTableForeignKeysWithWidgetKeys(dao, connectionId, tableName);

      if (foreignKeys && foreignKeys.length > 0) {
        await Promise.all(
          foreignKeys.map((el) => {
            try {
              this.attachForeignColumnNames(el, cognitoUserName, connectionId, masterPwd);
            } catch (e) {
              console.log(e);
              return el;
            }
          }),
        );
      }
      const structureRO = {
        structure: fullStructure,
        primaryColumns: primaryColumns,
        foreignKeys: foreignKeys as Array<IForeignKeyStructure>,
        readonly_fields: readonly_fields?.length > 0 ? readonly_fields : [],
        table_widgets: tableWidgets?.length > 0 ? tableWidgets : [],
      };
      //todo rework to returned once

      // if (!connection.isTestConnection) {
      //   this.logger.info({
      //     tableName: tableName,
      //     structure: structureRO,
      //     connectionId: connectionId,
      //     connectionType: connection.type,
      //   });
      // }
      return structureRO;
    } catch (e) {
      throw new HttpException(
        {
          message: `${Messages.FAILED_GET_TABLE_STRUCTURE} ${Messages.ERROR_MESSAGE}
         ${e.message} ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async isTestConnection(connectionId: string): Promise<boolean> {
    return await isTestConnectionById(connectionId);
  }

  async updateRowInTable(
    cognitoUserName: string,
    connectionId: string,
    tableName: string,
    row: string,
    primaryKey: any,
    masterPwd: string,
  ): Promise<ITableRowRO> {
    let operationResult = OperationResultStatusEnum.unknown;
    const errors = [];
    if (!primaryKey) {
      errors.push(Messages.PRIMARY_KEY_MISSING);
    }
    const connection = await this.findConnection(connectionId, masterPwd);

    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    errors.concat(await this.validateRow(cognitoUserName, connection, tableName, row, masterPwd));
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }
    const primaryColumns: Array<IPrimaryKeyInfo> = await dao.getTablePrimaryColumns(tableName, userEmail);

    const avaliablePrimaryColumns = [];
    for (const primaryColumn of primaryColumns) {
      avaliablePrimaryColumns.push(primaryColumn.column_name);
    }
    for (const key in primaryKey) {
      // eslint-disable-next-line security/detect-object-injection
      if (!primaryKey[key]) delete primaryKey[key];
    }
    const receivedPrimaryColumns = Object.keys(primaryKey);

    if (!compareArrayElements(avaliablePrimaryColumns, receivedPrimaryColumns)) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const oldRowData = await this.getRowByPrimaryKeyPrivate(
      cognitoUserName,
      connection,
      tableName,
      primaryKey,
      masterPwd,
    );
    const futureRowData = Object.assign(oldRowData.row, row);
    const futurePrimaryKey = {};
    for (const primaryColumn of primaryColumns) {
      futurePrimaryKey[primaryColumn.column_name] = futureRowData[primaryColumn.column_name];
    }
    try {
      row = await this.hashPasswordsInRow(row, connectionId, tableName);
      row = await this.processUUIDsInRow(row, connectionId, tableName);
      await dao.updateRowInTable(tableName, row, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      const updatedRow = await this.getRowByPrimaryKey(
        cognitoUserName,
        connectionId,
        tableName,
        futurePrimaryKey,
        masterPwd,
      );
      updatedRow.row = (await this.removePasswordsFromRows([updatedRow.row], connectionId, tableName))[0];
      return updatedRow;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: `${Messages.UPDATE_ROW_FAILED} ${Messages.ERROR_MESSAGE} "${e.message}"
         ${Messages.TRY_AGAIN_LATER}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: cognitoUserName,
        connection: connection,
        operationType: LogOperationTypeEnum.updateRow,
        operationStatusResult: operationResult,
        row: row,
        old_data: oldRowData,
      };
      await this.createLogRecord(logRecord);
      const isTest = await this.isTestConnection(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowUpdatedTest : AmplitudeEventTypeEnum.tableRowUpdated,
        cognitoUserName,
      );
    }
  }

  async validateTableSettings(
    createTableSettingDto: CreateTableSettingsDto,
    masterPwd: string,
  ): Promise<Array<string>> {
    const dao = createDao(await this.findConnection(createTableSettingDto.connection_id, masterPwd), null);
    return await dao.validateSettings(createTableSettingDto, createTableSettingDto.table_name, undefined);
  }

  private async addCustomFieldsIntoTableRows(
    rows: any,
    connectionId: string,
    tableName: string,
    structure,
  ): Promise<any> {
    const customTableFields = await this.getCustomFields(connectionId, tableName);
    if (!customTableFields || customTableFields.length <= 0) {
      return rows;
    } else {
      rows = sjson.parse(JSON.stringify(rows), null, {
        protoAction: 'remove',
        constructorAction: 'remove',
      });
      let { data } = rows;
      data = data.map((row) => {
        row['#autoadmin:customFields'] = [];
        for (const field of customTableFields) {
          const fieldNamesFromTemplateString = getValuesBetweenCurlies(field.template_string);
          const fieldValuesForTemplateString = [];
          for (const fieldName of fieldNamesFromTemplateString) {
            if (row.hasOwnProperty(fieldName) && getPropertyValueByDescriptor(row, fieldName)) {
              fieldValuesForTemplateString.push(getPropertyValueByDescriptor(row, fieldName));
            }
          }
          const generatedUrlString = replaceTextInCurlies(
            field.template_string,
            fieldNamesFromTemplateString,
            fieldValuesForTemplateString,
          );
          row['#autoadmin:customFields'].push({
            type: field.type,
            url_template: generatedUrlString,
            text: field.text,
          });
        }
        return row;
      });
      rows.data = data;
    }
    return rows;
  }

  private convertBinaryDataInRows(rows: any, structure: IStructureRO): any {
    let { data } = rows;
    const binaryColumns = structure.structure
      .map((el) => {
        return {
          column_name: el.column_name,
          data_type: el.data_type,
        };
      })
      .filter((el) => {
        return isBinary(el.data_type);
      });
    if (binaryColumns.length <= 0) {
      return rows;
    }
    data = data.map((el) => {
      for (const column of binaryColumns) {
        if (el[column.column_name]) {
          el[column.column_name] = binaryToHex(el[column.column_name]);
        }
      }
      return el;
    });
    rows.data = data;
    return rows;
  }

  private async attachForeignColumnNames(
    foreignKey: any,
    cognitoUserName: string,
    connectionId: string,
    masterPwd: string,
  ) {
    try {
      const foreignTableSettings = await this.findTableSettingsOrReturnEmpty(
        connectionId,
        foreignKey.referenced_table_name,
      );
      const foreignTableStruct = await this.getTableStructure(
        cognitoUserName,
        connectionId,
        foreignKey.referenced_table_name,
        masterPwd,
      );
      const { structure } = foreignTableStruct;
      let columnNames = structure.map((el) => {
        return el.column_name;
      });
      if (
        foreignTableSettings &&
        !isObjectEmpty(foreignTableSettings) &&
        foreignTableSettings.autocomplete_columns.length > 0
      ) {
        columnNames = columnNames.filter((el) => {
          const index = foreignTableSettings.autocomplete_columns.indexOf(el);
          return index >= 0;
        });
      }
      foreignKey.autocomplete_columns = columnNames;
    } catch (e) {
      foreignKey.autocomplete_columns = [];
    }
  }

  private async getRowByPrimaryKeyPrivate(
    cognitoUserName: string,
    connection: ConnectionEntity,
    tableName: string,
    primaryKey: any,
    masterPwd: string,
  ): Promise<ITableRowRO> {
    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }
    for (const key in primaryKey) {
      // eslint-disable-next-line security/detect-object-injection
      if (!primaryKey[key]) delete primaryKey[key];
    }

    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.connection_id', 'connection_id');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', {
      connection_id: connection.id,
    });
    qb.andWhere('tableSettings.table_name = :table_name', {
      table_name: tableName,
    });

    let tableSettings = (await qb.getOne()) as any;
    if (!tableSettings) {
      tableSettings = {};
    }
    const results = await Promise.all([
      dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      dao.getTableStructure(tableName, userEmail),
      // dao.getTableForeignKeys(tableName),
      this.getTableForeignKeysWithWidgetKeys(dao, connection.id, tableName),
      this.findAllTableWidgetsWithoutPermissions(connection.id, tableName),
    ]);

    const resultRow = results[0][0];
    if (!resultRow) {
      throw new HttpException(
        {
          message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const primaryColumns = results[1];
    let structure = results[2];
    const foreignKeys = results[3] as Array<IForeignKeyStructure>;
    const tableWidgets = results[4];
    const { search_fields, excluded_fields } = tableSettings;
    structure = structure.map((element) => {
      const { column_name, column_default, data_type, data_type_params, allow_null, character_maximum_length } =
        element;
      const indexSearch = search_fields?.indexOf(column_name);
      const indexExclude = excluded_fields?.indexOf(column_name);
      return {
        column_name: column_name,
        column_default: column_default,
        data_type: data_type,
        data_type_params: data_type_params ? data_type_params : undefined,
        isExcluded: indexExclude >= 0,
        isSearched: indexSearch >= 0,
        auto_increment: checkFieldAutoincrement(column_default),
        allow_null: allow_null,
        character_maximum_length: character_maximum_length,
      };
    });

    if (foreignKeys && foreignKeys.length > 0) {
      await Promise.all(
        foreignKeys.map(async (foreignKey) => {
          try {
            const foreignTableSettings = await this.findTableSettingsOrReturnEmpty(
              connection.id,
              foreignKey.referenced_table_name,
            );
            const foreignTableStruct: IStructureRO = await this.getTableStructure(
              cognitoUserName,
              connection.id,
              foreignKey.referenced_table_name,
              masterPwd,
            );
            const { structure } = foreignTableStruct;
            let columnNames = structure.map((el) => {
              return el.column_name;
            });
            if (
              foreignTableSettings &&
              !isObjectEmpty(foreignTableSettings) &&
              foreignTableSettings.autocomplete_columns
            ) {
              columnNames = columnNames.filter((el) => {
                const index = foreignTableSettings.autocomplete_columns.indexOf(el);
                return index >= 0;
              });
            }
            foreignKey.autocomplete_columns = columnNames;
          } catch (e) {
            foreignKey.autocomplete_columns = [];
          }
        }),
      );
    }
    return {
      row: resultRow,
      structure: structure,
      foreignKeys: foreignKeys,
      primaryColumns: primaryColumns,
      readonly_fields: tableSettings?.readonly_fields?.length > 0 ? tableSettings.readonly_fields : [],
      table_widgets: tableWidgets,
    };
  }

  async getTableStructurePrivate(
    cognitoUserName: string,
    connection: ConnectionEntity,
    tableName: string,
    masterPwd: string,
  ) {
    const dao = createDao(connection, cognitoUserName);
    let userEmail;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this.getUserEmail(cognitoUserName);
    }
    const tables = await dao.getTablesFromDB(userEmail);
    if (!tables.includes(tableName)) {
      throw new HttpException(
        {
          message: Messages.TABLE_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const structure = await dao.getTableStructure(tableName, userEmail);
    return structure.map((el) => {
      el.auto_increment = checkFieldAutoincrement(el.column_default);
      return el;
    });
  }

  private async hashPasswordsInRow(row: any, connectionId: string, tableName: string): Promise<string> {
    const tableWidgets = await this.findAllTableWidgetsWithoutPermissions(connectionId, tableName);
    if (!tableWidgets || tableWidgets.length <= 0) {
      return row;
    }
    const passwordWidgets = tableWidgets.filter((el) => {
      return el.widget_type === WidgetTypeEnum.Password;
    });
    if (passwordWidgets.length <= 0) {
      return row;
    }
    for (const widget of passwordWidgets) {
      try {
        const widgetParams = widget.widget_params as unknown as IPasswordWidgetParams;
        if (row[widget.field_name] && widgetParams.encrypt) {
          row[widget.field_name] = await Encryptor.processDataWithAlgorithm(
            row[widget.field_name],
            widgetParams.algorithm,
          );
        }
      } catch (e) {
        console.log('-> Error in password widget encryption processing', e);
      }
    }
    return row;
  }

  private async processUUIDsInRow(row: any, connectionId: string, tableName: string): Promise<string> {
    const tableWidgets = await this.findAllTableWidgetsWithoutPermissions(connectionId, tableName);
    if (!tableWidgets || tableWidgets.length <= 0) {
      return row;
    }

    const uuidWidgets = tableWidgets.filter((el) => {
      return el.widget_type === WidgetTypeEnum.UUID;
    });
    if (uuidWidgets.length <= 0) {
      return row;
    }

    for (const widget of uuidWidgets) {
      try {
        if (row[widget.field_name] && Buffer.isBuffer(widget.widget_params)) {
          row[widget.field_name] = uuidStringify(widget.widget_params);
        }
      } catch (e) {
        console.log('-> Error in password widget encryption processing', e);
      }
    }
    return row;
  }

  private async removePasswordsFromRows(
    rows: Array<any>,
    connectionId: string,
    tableName: string,
  ): Promise<Array<any>> {
    const tableWidgets = await this.findAllTableWidgetsWithoutPermissions(connectionId, tableName);
    if (!tableWidgets || tableWidgets.length <= 0) {
      return rows;
    }
    const passwordWidgets = tableWidgets.filter((el) => {
      return el.widget_type === WidgetTypeEnum.Password;
    });
    if (passwordWidgets.length <= 0) {
      return rows;
    }
    return rows.map((row) => {
      for (const widget of passwordWidgets) {
        if (row[widget.field_name]) {
          row[widget.field_name] = Constants.REMOVED_PASSWORD_VALUE;
        }
      }
      return row;
    });
  }

  private async getTableForeignKeysWithWidgetKeys(
    dao: IDaoInterface,
    connectionId: string,
    tableName: string,
  ): Promise<Array<IForeignKeyInfo>> {
    const foreignKeys: Array<IForeignKeyInfo> = await dao.getTableForeignKeys(tableName, undefined);
    const tableWidgets: Array<TableWidgetEntity> = await this.findAllTableWidgetsWithoutPermissions(
      connectionId,
      tableName,
    );
    if (!tableWidgets || tableWidgets.length <= 0) {
      return foreignKeys;
    }
    const foreignKeysFromWidgets: Array<IForeignKeyInfo> = tableWidgets
      .filter((el) => {
        return el.widget_type === WidgetTypeEnum.Foreign_key;
      })
      .map((widget) => {
        return widget.widget_params as unknown as IForeignKeyInfo;
      });
    return foreignKeys.concat(foreignKeysFromWidgets);
  }

  private async findAutocompleteFields(
    query: string,
    tableStructure: IStructureRO,
    tableSettings: TableSettingsEntity,
    referencedColumn: string,
  ): Promise<IAutocompleteFields> {
    const rowNames = tableStructure.structure.map((el) => {
      return el.column_name;
    });

    const { excluded_fields: excludedFields } = tableSettings;
    if (excludedFields?.indexOf(referencedColumn) >= 0 || rowNames.indexOf(referencedColumn) < 0) {
      throw new HttpException(
        {
          message: Messages.EXCLUDED_OR_NOT_EXISTS(referencedColumn),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let autocompleteFields = [];
    autocompleteFields.push(referencedColumn);
    if (tableSettings && !isObjectEmpty(tableSettings) && tableSettings.autocomplete_columns) {
      for (const column of tableSettings.autocomplete_columns) {
        const index = rowNames.indexOf(column);
        if (index >= 0) {
          autocompleteFields.push(rowNames.at(index));
        }
      }
    } else if (tableSettings && !isObjectEmpty(tableSettings) && tableSettings.excluded_fields) {
      for (const column of tableSettings.excluded_fields) {
        const indexInAll = rowNames.indexOf(column);
        const indexInExcluded = tableSettings.excluded_fields.indexOf(column);
        if (indexInAll >= 0 && indexInExcluded < 0) {
          autocompleteFields.push(column);
        }
      }
    } else {
      autocompleteFields = rowNames;
    }
    if (tableSettings && !isObjectEmpty(tableSettings)) {
      const identityColumnIndex = autocompleteFields.findIndex((columnName) => {
        return columnName === tableSettings?.identity_column;
      });
      if (identityColumnIndex < 0) {
        if (tableSettings.identity_column && tableSettings.identity_column.length > 0) {
          autocompleteFields.unshift(tableSettings.identity_column);
        }
      }
    }
    return {
      fields: autocompleteFields,
      value: query['autocomplete'] === '' ? '*' : query['autocomplete'],
    };
  }

  private async findConnection(connectionId: string, masterPwd: string): Promise<ConnectionEntity> {
    let connection;
    try {
      const qb = await getRepository(ConnectionEntity)
        .createQueryBuilder('connection')
        .leftJoinAndSelect('connection.agent', 'agent');
      qb.andWhere('connection.id = :id', { id: connectionId });
      connection = await qb.getOne();
      if (connection && connection.masterEncryption) {
        if (!masterPwd) {
          throw new HttpException(
            {
              message: Messages.MASTER_PASSWORD_MISSING,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
      }
    } catch (e) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return connection;
  }

  private async findOrderingField(
    query: string,
    tableStructure: IStructureRO,
    tableSettings: TableSettingsEntity,
  ): Promise<IOrderingField> {
    const rowNames = tableStructure.structure.map((el) => {
      return el.column_name;
    });
    let orderingField = undefined;
    if (query.hasOwnProperty('sort_by') && query.hasOwnProperty('sort_order')) {
      const sortByFieldName = query['sort_by'];
      const sortByOrder = query['sort_order'];
      const sortFieldIndex = rowNames.indexOf(sortByFieldName);
      if (sortFieldIndex < 0) {
        throw new HttpException(
          {
            message: Messages.EXCLUDED_OR_NOT_EXISTS(sortByFieldName),
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (tableSettings.sortable_by && tableSettings.sortable_by.length > 0) {
        const sortFieldIndex = tableSettings.sortable_by.indexOf(sortByFieldName);
        if (sortFieldIndex < 0) {
          throw new HttpException(
            {
              message: Messages.FIELD_MUST_BE_SORTABLE(sortByFieldName),
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      if (!Object.keys(QueryOrderingEnum).find((key) => key === sortByOrder)) {
        throw new HttpException(
          {
            message: Messages.ORDERING_FIELD_INCORRECT,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      orderingField = {
        field: sortByFieldName,
        value: sortByOrder,
      };
    }

    return orderingField;
  }

  private async validateRow(
    cognitoUserName: string,
    connection: ConnectionEntity,
    tableName: string,
    row: string,
    masterPwd: string,
  ): Promise<Array<string>> {
    const structure = await this.getTableStructurePrivate(cognitoUserName, connection, tableName, masterPwd);
    const errors = [];
    const keys = Object.keys(row);
    keys.map((key) => {
      key.toLowerCase();
    });

    for (let i = 0; i < structure.length; i++) {
      try {
        const index = keys.indexOf(structure.at(i)['column_name'] || structure.at(i)['COLUMN_NAME']);
        if (
          (index >= 0 &&
            structure.at(i)['column_default'] != null &&
            structure.at(i)['column_default'].includes('nextval')) ||
          (index >= 0 &&
            structure.at(i)['column_default'] != null &&
            structure.at(i)['column_default'].includes('generate'))
        ) {
          errors.push(Messages.CANNOT_ADD_AUTOGENERATED_VALUE);
        }
      } catch (e) {}
    }
    return errors;
  }

  private findFilteringFields(query: string, tableStructure: IStructureRO): Array<IFilteringFields> {
    const rowNames = tableStructure.structure.map((el) => {
      return el.column_name;
    });
    const filteringItems = [];
    for (const fieldname of rowNames) {
      if (query.hasOwnProperty(`f_${fieldname}__eq`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.eq,
          value: query[`f_${fieldname}__eq`],
        });
      }

      if (query.hasOwnProperty(`f_${fieldname}__startswith`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.startswith,
          value: query[`f_${fieldname}__startswith`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__endswith`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.endswith,
          value: query[`f_${fieldname}__endswith`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__gt`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.gt,
          value: query[`f_${fieldname}__gt`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__lt`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.lt,
          value: query[`f_${fieldname}__lt`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__lte`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.lte,
          value: query[`f_${fieldname}__lte`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__gte`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.gte,
          value: query[`f_${fieldname}__gte`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__contains`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.contains,
          value: query[`f_${fieldname}__contains`],
        });
      }
      if (query.hasOwnProperty(`f_${fieldname}__icontains`)) {
        filteringItems.push({
          field: fieldname,
          criteria: FilterCriteriaEnum.icontains,
          value: query[`f_${fieldname}__icontains`],
        });
      }
    }
    return filteringItems;
  }

  private async getUserEmail(userId: string): Promise<string> {
    const userEmail = (await this.findOneUserById(userId)).email;
    return userEmail ? userEmail : 'unknown';
  }

  private async addDisplayNamesIntoTablesArr(
    connectionId: string,
    tablesObjArr: Array<ITablePermissionData>,
  ): Promise<Array<any>> {
    const tableSettings = await this.findTableSettingsInConnection(connectionId);
    return tablesObjArr.map((tableObj: ITablePermissionData) => {
      const displayName =
        tableSettings[
          tableSettings.findIndex((el: TableSettingsEntity) => {
            return el.table_name === tableObj.tableName;
          })
        ]?.display_name;
      return {
        table: tableObj.tableName,
        permissions: tableObj.accessLevel,
        display_name: displayName ? displayName : undefined,
      };
    });
  }

  //todo temporary fix. remove with transfer to new architecture

  private async createLogRecord(logData: CreateLogRecordDs): Promise<CreatedLogRecordDs> {
    const { userId } = logData;
    const foundUser = await this.userRepository.findOne({ id: userId });
    const { email } = foundUser;
    const newLogRecord = buildTableLogsEntity(logData, email);
    const savedLogRecord = await this.tableLogsRepository.save(newLogRecord);
    return buildCreatedLogRecord(savedLogRecord);
  }

  private async findTableSettingsOrReturnEmpty(connectionId: string, tableName: string): Promise<any> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.connection_id', 'connection_id');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    const result = await qb.getOne();
    return result ? result : {};
  }

  private async findTableSettingsInConnection(connectionId: string): Promise<Array<TableSettingsEntity>> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.connection_id', 'connection_id');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    return await qb.getMany();
  }

  private async getUserPermissionsForAvailableTables(
    cognitoUserName: string,
    connectionId: string,
    tableNames: Array<string>,
  ): Promise<Array<ITablePermissionData>> {
    const connectionEdit = await this.checkUserConnectionEdit(cognitoUserName, connectionId);
    const tablesWithPermissionsArr = [];

    if (connectionEdit) {
      for (const tableName of tableNames) {
        tablesWithPermissionsArr.push({
          tableName: tableName,
          accessLevel: {
            visibility: true,
            readonly: false,
            add: true,
            delete: true,
            edit: true,
          },
        });
      }
      return tablesWithPermissionsArr;
    }

    const qb = await getRepository(PermissionEntity)
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('user.id = :cognitoUserName', { cognitoUserName: cognitoUserName })
      .andWhere('permission.type = :permissionType', { permissionType: PermissionTypeEnum.Table });
    const allTablePermissions = await qb.getMany();

    const tablesAndAccessLevels = {};
    for (const tableName of tableNames) {
      if (tableName !== '__proto__') {
        // eslint-disable-next-line security/detect-object-injection
        tablesAndAccessLevels[tableName] = [];
      }
    }

    for (const tableName of tableNames) {
      for (const permission of allTablePermissions) {
        if (permission.tableName === tableName && tablesAndAccessLevels.hasOwnProperty(tableName)) {
          // eslint-disable-next-line security/detect-object-injection
          tablesAndAccessLevels[tableName].push(permission.accessLevel);
        }
      }
    }

    for (const key in tablesAndAccessLevels) {
      if (tablesAndAccessLevels.hasOwnProperty(key)) {
        // eslint-disable-next-line security/detect-object-injection
        const addPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.add);
        // eslint-disable-next-line security/detect-object-injection
        const deletePermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.delete);
        // eslint-disable-next-line security/detect-object-injection
        const editPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.edit);

        const readOnly = !(addPermission || deletePermission || editPermission);
        tablesWithPermissionsArr.push({
          tableName: key,
          accessLevel: {
            // eslint-disable-next-line security/detect-object-injection
            visibility: tablesAndAccessLevels[key].includes(AccessLevelEnum.visibility),
            // eslint-disable-next-line security/detect-object-injection
            readonly: tablesAndAccessLevels[key].includes(AccessLevelEnum.readonly) && !readOnly,
            add: addPermission,
            delete: deletePermission,
            edit: editPermission,
          },
        });
      }
    }
    return tablesWithPermissionsArr.filter((tableWithPermission: ITablePermissionData) => {
      return !!tableWithPermission.accessLevel.visibility;
    });
  }

  private async checkUserConnectionEdit(cognitoUserName: string, connectionId: string): Promise<boolean> {
    const connectionAccessLevel = await this.getUserConnectionAccessLevel(cognitoUserName, connectionId);
    switch (connectionAccessLevel) {
      case AccessLevelEnum.edit:
      case AccessLevelEnum.fullaccess:
        return true;
      case AccessLevelEnum.readonly:
        return false;
      default:
        return false;
    }
  }

  private async getUserConnectionAccessLevel(cognitoUserName: string, connectionId: string): Promise<AccessLevelEnum> {
    const qb = await getRepository(PermissionEntity)
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', { connectionId: connectionId })
      .andWhere('user.id = :cognitoUserName', { cognitoUserName: cognitoUserName })
      .andWhere('permission.type = :permissionType', { permissionType: PermissionTypeEnum.Connection });
    const resultPermissions = await qb.getMany();
    if (resultPermissions?.length === 0) {
      return AccessLevelEnum.none;
    }
    const connectionAccessLevels = resultPermissions.map((permission: PermissionEntity) => {
      return permission.accessLevel.toLowerCase();
    });
    if (
      connectionAccessLevels.includes(AccessLevelEnum.fullaccess) ||
      connectionAccessLevels.includes(AccessLevelEnum.edit)
    ) {
      return AccessLevelEnum.edit;
    }
    if (connectionAccessLevels.includes(AccessLevelEnum.readonly)) {
      return AccessLevelEnum.readonly;
    }
    return AccessLevelEnum.none;
  }

  private async findConnectionProperties(connectionId: string): Promise<ConnectionPropertiesEntity> {
    const qb = await getRepository(ConnectionPropertiesEntity)
      .createQueryBuilder('connectionProperties')
      .leftJoinAndSelect('connectionProperties.connection', 'connection');
    qb.where('1=1');
    qb.andWhere('connectionProperties.connection.id = :connection_id', { connection_id: connectionId });
    return await qb.getOne();
  }

  private async getCustomFields(connectionId: string, tableName: string): Promise<Array<CustomFieldsEntity>> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.custom_fields', 'custom_fields');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', {
      connection_id: connectionId,
    });
    qb.andWhere('tableSettings.table_name = :table_name', {
      table_name: tableName,
    });
    const result = await qb.getOne();
    return result?.custom_fields ? result.custom_fields : [];
  }

  private async findOneUserById(userId: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ id: userId });
  }

  private async findAllTableWidgetsWithoutPermissions(
    connectionId: string,
    tableName: string,
  ): Promise<Array<TableWidgetEntity>> {
    const qb = await getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.table_widgets', 'table_widgets');
    qb.where('1=1');
    qb.andWhere('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    const result = await qb.getOne();
    return result?.table_widgets ? result?.table_widgets : null;
  }
}
