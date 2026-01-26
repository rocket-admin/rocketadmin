import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum, LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements, isConnectionTypeAgent } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { DeleteRowsFromTableDs } from '../application/data-structures/delete-row-from-table.ds.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { findObjectsWithProperties } from '../utils/find-objects-with-properties.js';
import { IDeleteRowsFromTable } from './table-use-cases.interface.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';

type DeleteRowsFromTableResult = {
  operationStatusResult: OperationResultStatusEnum;
  row: Record<string, unknown>;
  old_data: Record<string, unknown>;
  error: string;
  affected_primary_key: string;
};

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
    // eslint-disable-next-line prefer-const
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

    if (connection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
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

    const [tableStructure, primaryColumns, tableSettings, personalTableSettings] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      this._dbContext.personalTableSettingsRepository.findUserTableSettings(userId, connectionId, tableName),
    ]);

    if (tableSettings && !tableSettings?.can_delete) {
      throw new HttpException(
        {
          message: Messages.CANT_DO_TABLE_OPERATION,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    primaryKeys = primaryKeys.map((primaryKey) => convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure));

    const availablePrimaryColumns: Array<string> = primaryColumns.map((column) => column.column_name);

    primaryKeys.forEach((primaryKey) => {
      Object.keys(primaryKey).forEach((key) => {
        // eslint-disable-next-line security/detect-object-injection
        if (!primaryKey[key] && primaryKey[key] !== '') {
          // eslint-disable-next-line security/detect-object-injection
          delete primaryKey[key];
        }
      });

      const receivedPrimaryColumns = Object.keys(primaryKey);
      if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
        throw new HttpException(
          {
            message: Messages.PRIMARY_KEY_INVALID,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    });
    let oldRowsData: Array<Record<string, unknown>>;
    const builtDAOsTableSettings = buildDAOsTableSettingsDs(tableSettings, personalTableSettings);
    try {
      oldRowsData = await dao.bulkGetRowsFromTableByPrimaryKeys(
        tableName,
        primaryKeys,
        builtDAOsTableSettings,
        userEmail,
      );
    } catch (error) {
      throw new HttpException(
        {
          message: Messages.BULK_DELETE_FAILED_GET_ROWS([error.message]),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const deleteOperationsResults: Array<DeleteRowsFromTableResult> = [];

    try {
      await dao.bulkDeleteRowsInTable(tableName, primaryKeys, userEmail);
      primaryKeys.forEach((primaryKey) => {
        deleteOperationsResults.push({
          operationStatusResult: OperationResultStatusEnum.successfully,
          row: primaryKey,
          old_data: findObjectsWithProperties(oldRowsData, primaryKey).at(0),
          error: null,
          affected_primary_key: primaryKey as unknown as string,
        });
      });
      return true;
    } catch (error) {
      primaryKeys.forEach((primaryKey) => {
        deleteOperationsResults.push({
          operationStatusResult: OperationResultStatusEnum.unsuccessfully,
          row: primaryKey,
          old_data: findObjectsWithProperties(oldRowsData, primaryKey).at(0),
          error: error.message,
          affected_primary_key: primaryKey as unknown as string,
        });
      });
      throw error;
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
