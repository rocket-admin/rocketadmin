import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import {
  IDataAccessObject,
  IForeignKey,
  IForeignKeyWithForeignColumnName,
} from '../../../data-access-layer/shared/data-access-object-interface';
import {
  AmplitudeEventTypeEnum,
  LogOperationTypeEnum,
  OperationResultStatusEnum,
  WidgetTypeEnum,
} from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { isConnectionTypeAgent, isObjectEmpty, toPrettyErrorsMsg } from '../../../helpers';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util';
import { TableLogsService } from '../../table-logs/table-logs.service';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds';
import { IForeignKeyInfo, ITableRowRO } from '../table.interface';
import { convertHexDataInRowUtil } from '../utils/convert-hex-data-in-row.util';
import { formFullTableStructure } from '../utils/form-full-table-structure';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util';
import { validateTableRowUtil } from '../utils/validate-table-row.util';
import { IAddRowInTable } from './table-use-cases.interface';

@Injectable()
export class AddRowInTableUseCase extends AbstractUseCase<AddRowInTableDs, ITableRowRO> implements IAddRowInTable {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: AddRowInTableDs): Promise<ITableRowRO> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, row, tableName, userId } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    let operationResult = OperationResultStatusEnum.unknown;

    const dao = createDataAccessObject(connection, userId);

    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }

    // eslint-disable-next-line prefer-const
    let [tableStructure, tableWidgets, tableSettings, tableForeignKeys, tablePrimaryKeys] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      dao.getTableForeignKeys(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
    ]);

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

    const errors = validateTableRowUtil(row, tableStructure);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
    try {
      row = await hashPasswordsInRowUtil(row, tableWidgets);
      row = processUuidsInRowUtil(row, tableWidgets);
      row = convertHexDataInRowUtil(row, tableStructure);
      const result = (await dao.addRowInTable(tableName, row, userEmail)) as Record<string, unknown>;
      if (result && !isObjectEmpty(result)) {
        operationResult = OperationResultStatusEnum.successfully;
        let addedRow = await dao.getRowByPrimaryKey(tableName, result, tableSettings, userEmail);
        addedRow = removePasswordsFromRowsUtil(addedRow, tableWidgets);

        return {
          row: addedRow,
          foreignKeys: foreignKeysWithAutocompleteColumns,
          primaryColumns: tablePrimaryKeys,
          structure: formedTableStructure,
          table_widgets: tableWidgets,
          readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
          list_fields: tableSettings?.list_fields?.length > 0 ? tableSettings.list_fields : [],
        };
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
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.addRow,
        operationStatusResult: operationResult,
        row: row,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
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
