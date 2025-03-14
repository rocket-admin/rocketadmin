import { createDao } from '../dal/shared/create-dao.js';
import { ICLIConnectionCredentials, IMessageData } from '../interfaces/interfaces.js';
import { Messages } from '../text/messages.js';
import { OperationTypeEnum } from '../enums/operation-type.enum.js';
import { OperationResultStatusEnum } from '../enums/operation-result-status.enum.js';
import { LogOperationTypeEnum } from '../enums/log-operation-type.enum.js';
import { Logger } from '../helpers/app-logs/logger.js';

export class CommandExecutor {
  private readonly connectionConfig: ICLIConnectionCredentials;

  constructor(connectionConfig: ICLIConnectionCredentials) {
    this.connectionConfig = connectionConfig;
  }

  async executeCommand(messageData: IMessageData): Promise<any> {
    const dao = createDao(this.connectionConfig);
    const {
      operationType,
      tableName,
      row,
      primaryKey,
      tableSettings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      autocompleteFields,
      email,
      referencedFieldName,
      identityColumnName,
      fieldValues,
    } = messageData.data;
    let operationStatusResult = OperationResultStatusEnum.unknown;
    switch (operationType) {
      case OperationTypeEnum.addRowInTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.addRowInTable(tableName, row);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_ADD_ROW_IN_TABLE);
        } finally {
          Logger.createLogRecord(row, tableName, email, LogOperationTypeEnum.addRow, operationStatusResult, null);
        }
        break;
      case OperationTypeEnum.deleteRowInTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.deleteRowInTable(tableName, primaryKey);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_DELETE_ROW_IN_TABLE);
        } finally {
          Logger.createLogRecord(
            primaryKey,
            tableName,
            email,
            LogOperationTypeEnum.deleteRow,
            operationStatusResult,
            null,
          );
        }
        break;
      case OperationTypeEnum.getRowByPrimaryKey:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_ROW_FROM_TABLE);
        } finally {
          Logger.createLogRecord(
            primaryKey,
            tableName,
            email,
            LogOperationTypeEnum.rowReceived,
            operationStatusResult,
            null,
          );
        }
        break;
      case OperationTypeEnum.getRowsFromTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.getRowsFromTable(
            tableName,
            tableSettings,
            page,
            perPage,
            searchedFieldValue,
            filteringFields,
            autocompleteFields,
          );
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_ROWS_FROM_TABLE);
        } finally {
          Logger.createLogRecord(
            null,
            tableName,
            email,
            LogOperationTypeEnum.rowsReceived,
            operationStatusResult,
            null,
          );
        }
        break;
      case OperationTypeEnum.getTableForeignKeys:
        try {
          return await dao.getTableForeignKeys(tableName);
        } catch (e) {
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_TABLE_FOREIGN_KEYS);
        }
      case OperationTypeEnum.getTablePrimaryColumns:
        try {
          return await dao.getTablePrimaryColumns(tableName);
        } catch (e) {
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_TABLE_PRIMARY_COLUMNS);
        }
      case OperationTypeEnum.getTableStructure:
        try {
          return await dao.getTableStructure(tableName);
        } catch (e) {
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_TABLE_STRUCTURE);
        }
      case OperationTypeEnum.getTablesFromDB:
        try {
          return await dao.getTablesFromDB();
        } catch (e) {
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_TABLE_STRUCTURE);
        }
      case OperationTypeEnum.testConnect:
        try {
          return await dao.testConnect();
        } catch (e) {
          console.log(Messages.FAIL_MESSAGE(e.message));
          return false;
        }
      case OperationTypeEnum.updateRowInTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.updateRowInTable(tableName, row, primaryKey);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_UPDATE_ROW);
        } finally {
          Logger.createLogRecord(row, tableName, email, LogOperationTypeEnum.updateRow, operationStatusResult, null);
        }

      case OperationTypeEnum.validateSettings:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.validateSettings(tableSettings, tableName);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_VALIDATE_TABLE_SETTINGS);
        }
      case OperationTypeEnum.getIdentityColumns:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.getIdentityColumns(tableName, referencedFieldName, identityColumnName, fieldValues);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_TO_GET_IDENTITY_COLUMNS);
        }

      case OperationTypeEnum.getReferencedTableNamesAndColumns:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.getReferencedTableNamesAndColumns(tableName);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_TO_GET_IDENTITY_COLUMNS);
        }
      case OperationTypeEnum.isView:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.isView(tableName);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_TO_CHECK_IS_VIEW);
        }

      case OperationTypeEnum.getRowsAsStream:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.getRowsFromTable(
            tableName,
            tableSettings,
            page,
            perPage,
            searchedFieldValue,
            filteringFields,
            autocompleteFields,
          );
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_GET_ROWS_FROM_TABLE);
        } finally {
          Logger.createLogRecord(
            null,
            tableName,
            email,
            LogOperationTypeEnum.rowsReceived,
            operationStatusResult,
            null,
          );
        }
        break;
      case OperationTypeEnum.bulkUpdateRowsInTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.bulkUpdateRowsInTable(tableName, row, primaryKey);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_TO_UPDATE_ROWS);
        } finally {
          Logger.createLogRecord(row, tableName, email, LogOperationTypeEnum.updateRow, operationStatusResult, null);
        }
        break;
      case OperationTypeEnum.bulkDeleteRowsInTable:
        try {
          operationStatusResult = OperationResultStatusEnum.successfully;
          return await dao.bulkDeleteRowsInTable(tableName, primaryKey);
        } catch (e) {
          operationStatusResult = OperationResultStatusEnum.unsuccessfully;
          console.log(Messages.FAIL_MESSAGE(e.message));
          return new Error(Messages.FAILED_TO_UPDATE_ROWS);
        } finally {
          Logger.createLogRecord(
            primaryKey,
            tableName,
            email,
            LogOperationTypeEnum.deleteRow,
            operationStatusResult,
            null,
          );
        }
        break;
      case OperationTypeEnum.executeRawQuery:
        try {
          return await dao.executeRawQuery(row, tableName);
        } catch (error) {
          console.log(Messages.FAIL_MESSAGE(error.message));
          return new Error(Messages.FAILED_EXECUTE_RAW_QUERY);
        }
      default:
        return new Error(Messages.UNKNOWN_OPERATION(operationType));
    }
  }
}
