import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { DeleteRowFromTableDs } from '../application/data-structures/delete-row-from-table.ds';
import { DeletedRowFromTableDs } from '../application/data-structures/deleted-row-from-table.ds';
import { IDeleteRowFromTable } from './table-use-cases.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { AmplitudeEventTypeEnum, LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { compareArrayElements, isConnectionTypeAgent, toPrettyErrorsMsg } from '../../../helpers';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { crateAndSaveNewLogUtil } from '../../table-logs/utils/crate-and-save-new-log-util';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util';
import AbstractUseCase from '../../../common/abstract-use.case';

@Injectable({ scope: Scope.REQUEST })
export class DeleteRowFromTableUseCase
  extends AbstractUseCase<DeleteRowFromTableDs, DeletedRowFromTableDs>
  implements IDeleteRowFromTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteRowFromTableDs): Promise<DeletedRowFromTableDs> {
    const { connectionId, masterPwd, primaryKey, tableName, userId } = inputData;
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
    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);
    const availablePrimaryColumns: Array<string> = primaryColumns.map((column) => column.column_name);
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
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);
    const oldRowData = await dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail);
    if (!oldRowData) {
      throw new HttpException(
        {
          message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      await dao.deleteRowInTable(tableName, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      return {
        row: oldRowData,
      };
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
        userId: userId,
        connection: connection,
        operationType: LogOperationTypeEnum.deleteRow,
        operationStatusResult: operationResult,
        row: primaryKey,
        old_data: oldRowData,
      };
      await crateAndSaveNewLogUtil(logRecord);
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowDeletedTest : AmplitudeEventTypeEnum.tableRowDeleted,
        userId,
      );
    }
  }
}
