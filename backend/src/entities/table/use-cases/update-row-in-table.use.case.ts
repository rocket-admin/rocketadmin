import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IUpdateRowInTable } from './table-use-cases.interface';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds';
import { IForeignKeyInfo, ITableRowRO } from '../table.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import {
  AmplitudeEventTypeEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  WidgetTypeEnum,
} from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { compareArrayElements, isConnectionTypeAgent, toPrettyErrorsMsg } from '../../../helpers';
import {
  IDataAccessObject,
  IForeignKey,
  IForeignKeyWithForeignColumnName,
} from '../../../data-access-layer/shared/data-access-object-interface';
import { validateTableRowUtil } from '../utils/validate-table-row.util';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util';
import { formFullTableStructure } from '../utils/form-full-table-structure';
import { crateAndSaveNewLogUtil } from '../../table-logs/utils/crate-and-save-new-log-util';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util';
import AbstractUseCase from '../../../common/abstract-use.case';

@Injectable({ scope: Scope.REQUEST })
export class UpdateRowInTableUseCase
  extends AbstractUseCase<UpdateRowInTableDs, ITableRowRO>
  implements IUpdateRowInTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateRowInTableDs): Promise<ITableRowRO> {
    let { connectionId, masterPwd, primaryKey, row, tableName, userId } = inputData;
    let operationResult = OperationResultStatusEnum.unknown;

    let errors = [];
    if (!primaryKey) {
      errors.push(Messages.PRIMARY_KEY_MISSING);
    }

    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dao = createDataAccessObject(connection, userId);

    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }

    let [tableStructure, tableWidgets, tableSettings, tableForeignKeys, tablePrimaryKeys] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
    ]);

    const validationErrors = validateTableRowUtil(row, tableStructure);
    errors = errors.concat(validationErrors);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foreignKeysFromWidgets: Array<IForeignKeyInfo> = tableWidgets
      .filter((el) => {
        return el.widget_type === WidgetTypeEnum.Foreign_key;
      })
      .map((widget) => {
        return widget.widget_params as unknown as IForeignKeyInfo;
      });

    tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);

    let foreignKeysWithAutocompleteColumns: Array<IForeignKeyWithForeignColumnName> = [];

    if (tableForeignKeys && tableForeignKeys.length > 0) {
      foreignKeysWithAutocompleteColumns = await Promise.all(
        tableForeignKeys.map((el) => {
          try {
            return this.attachForeignColumnNames(el, userId, connectionId, dao);
          } catch (e) {
            return el as IForeignKeyWithForeignColumnName;
          }
        }),
      );
    }

    const availablePrimaryColumns = tablePrimaryKeys.map((key) => {
      return key.column_name;
    });
    for (const key in primaryKey) {
      // eslint-disable-next-line security/detect-object-injection
      if (!primaryKey[key]) delete primaryKey[key];
    }
    const receivedPrimaryColumns = Object.keys(primaryKey);

    if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_INVALID,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldRowData = await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail);
    if (!oldRowData) {
      throw new HttpException(
        {
          message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const futureRowData = Object.assign(oldRowData, row);
    const futurePrimaryKey = {};
    for (const primaryColumn of tablePrimaryKeys) {
      futurePrimaryKey[primaryColumn.column_name] = futureRowData[primaryColumn.column_name];
    }
    const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
    try {
      row = await hashPasswordsInRowUtil(row, tableWidgets);
      row = processUuidsInRowUtil(row, tableWidgets);
      await dao.updateRowInTable(tableName, row, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      let updatedRow = await dao.getRowByPrimaryKey(tableName, futurePrimaryKey, tableSettings, userEmail);
      updatedRow = removePasswordsFromRowsUtil(updatedRow, tableWidgets);
      return {
        row: updatedRow,
        foreignKeys: foreignKeysWithAutocompleteColumns,
        primaryColumns: tablePrimaryKeys,
        structure: formedTableStructure,
        table_widgets: tableWidgets,
        readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
      };
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
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.updateRow,
        operationStatusResult: operationResult,
        row: row,
        old_data: oldRowData,
      };
      await crateAndSaveNewLogUtil(logRecord);
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
        userId,
      );
    }
  }

  private async attachForeignColumnNames(
    foreignKey: IForeignKey,
    userId: string,
    connectionId: string,
    dao: IDataAccessObject,
  ): Promise<IForeignKeyWithForeignColumnName> {
    try {
      const [foreignTableSettings, foreignTableStructure] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, foreignKey.referenced_table_name),
        dao.getTableStructure(foreignKey.referenced_table_name, userId),
      ]);

      let columnNames = foreignTableStructure.map((el) => {
        return el.column_name;
      });
      if (foreignTableSettings && foreignTableSettings.autocomplete_columns.length > 0) {
        columnNames = columnNames.filter((el) => {
          const index = foreignTableSettings.autocomplete_columns.indexOf(el);
          return index >= 0;
        });
      }
      return {
        ...foreignKey,
        autocomplete_columns: columnNames,
      };
    } catch (e) {
      return {
        ...foreignKey,
        autocomplete_columns: [],
      };
    }
  }
}
