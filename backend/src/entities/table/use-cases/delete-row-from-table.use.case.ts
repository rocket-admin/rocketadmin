import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { AmplitudeEventTypeEnum, LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { DeleteRowFromTableDs } from '../application/data-structures/delete-row-from-table.ds.js';
import { DeletedRowFromTableDs } from '../application/data-structures/deleted-row-from-table.ds.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { IDeleteRowFromTable } from './table-use-cases.interface.js';

@Injectable()
export class DeleteRowFromTableUseCase
  extends AbstractUseCase<DeleteRowFromTableDs, DeletedRowFromTableDs>
  implements IDeleteRowFromTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteRowFromTableDs): Promise<DeletedRowFromTableDs> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, primaryKey, tableName, userId } = inputData;
    let operationResult = OperationResultStatusEnum.unknown;
    if (!primaryKey) {
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

    const dao = getDataAccessObject(connection);
    let userEmail: string;
    if (isConnectionTypeAgent(connection.type)) {
      userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
    }
    const isView = await dao.isView(tableName, userEmail);
    if (isView) {
      throw new HttpException(
        {
          message: Messages.CANT_UPDATE_TABLE_VIEW,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const tableStructure = await dao.getTableStructure(tableName, userEmail);
    primaryKey = convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
    const primaryColumns = await dao.getTablePrimaryColumns(tableName, userEmail);
    const availablePrimaryColumns: Array<string> = primaryColumns.map((column) => column.column_name);
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
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);

    if (tableSettings && !tableSettings?.can_delete) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
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
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
      const isTest = isTestConnectionUtil(connection);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.tableRowDeletedTest : AmplitudeEventTypeEnum.tableRowDeleted,
        userId,
      );
    }
  }
}
