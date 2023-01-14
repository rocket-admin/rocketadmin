import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { AmplitudeEventTypeEnum, LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util';
import { TableLogsService } from '../../table-logs/table-logs.service';
import { DeleteRowsFromTableDs } from '../application/data-structures/delete-row-from-table.ds';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util';
import { findObjectsWithProperties } from '../utils/find-objects-with-properties';
import { IDeleteRowsFromTable } from './table-use-cases.interface';

@Injectable()
export class DeleteRowsFromTableUseCase
  extends AbstractUseCase<DeleteRowsFromTableDs, boolean>
  implements IDeleteRowsFromTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteRowsFromTableDs): Promise<boolean> {
    let { connectionId, masterPwd, primaryKeys, tableName, userId } = inputData;
    if (!primaryKeys) {
      throw new HttpException(
        {
          message: Messages.PRIMARY_KEY_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
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

    const [tableStructure, primaryColumns, tableSettings] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
    ]);

    if (tableSettings && !tableSettings?.can_delete) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    primaryKeys = primaryKeys.map((primaryKey) => {
      return convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
    });
    const availablePrimaryColumns: Array<string> = primaryColumns.map((column) => column.column_name);
    for (const primaryKey of primaryKeys) {
      for (const key in primaryKey) {
        // eslint-disable-next-line security/detect-object-injection
        if (!primaryKey[key] && primaryKey[key] !== '') delete primaryKey[key];
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
    }

    const errorReasonsArray: Array<string> = [];
    const oldRowsData: Array<Record<string, unknown>> = (
      await Promise.allSettled(
        primaryKeys.map((primaryKey) => dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail)),
      )
    )
      .map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          errorReasonsArray.push(result.reason.message);
          return null;
        }
      })
      .filter((result) => result !== null);

    if (errorReasonsArray.length > 0) {
      throw new HttpException(
        {
          message: Messages.BULK_DELETE_FAILED_GET_ROWS(errorReasonsArray),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const deleteOperationsResults: Array<{
      operationStatusResult: OperationResultStatusEnum;
      row: Record<string, unknown>;
      old_data: Record<string, unknown>;
    }> = [];

    for (const primaryKey of primaryKeys) {
      let operationResult = OperationResultStatusEnum.unknown;
      try {
        await dao.deleteRowInTable(tableName, primaryKey, userEmail);
        operationResult = OperationResultStatusEnum.successfully;
      } catch (error) {
        operationResult = OperationResultStatusEnum.unsuccessfully;
      } finally {
        deleteOperationsResults.push({
          operationStatusResult: operationResult,
          row: primaryKey,
          old_data: findObjectsWithProperties(oldRowsData, primaryKey).at(0),
        });
      }
    }
    try {
      return true;
    } catch (error) {
    } finally {
      const createdLogs = await this.tableLogsService.createAndSaveNewLogsUtil(
        deleteOperationsResults,
        userId,
        connection,
        tableName,
        LogOperationTypeEnum.deleteRow,
      );
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowDeletedTest : AmplitudeEventTypeEnum.tableRowDeleted,
        userId,
        { operationCount: createdLogs.length },
      );
    }
  }
}
