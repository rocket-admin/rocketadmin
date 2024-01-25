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
import {
  DeleteRowsFromTableDs,
} from '../application/data-structures/delete-row-from-table.ds.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { findObjectsWithProperties } from '../utils/find-objects-with-properties.js';
import { IDeleteRowsFromTable } from './table-use-cases.interface.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';
import PQueue from 'p-queue';

type DeleteRowsFromTableResult = {
  operationStatusResult: OperationResultStatusEnum;
  row: Record<string, unknown>;
  old_data: Record<string, unknown>;
  error: string;
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

    let tableStructure: Array<TableStructureDS>;
    let primaryColumns: Array<PrimaryKeyDS>;
    let tableSettings: TableSettingsEntity;

    const [tableStructureResult, primaryColumnsResult, tableSettingsResult] = await Promise.allSettled([
      dao.getTableStructure(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
    ]);
    const errors = [];

    if (tableStructureResult.status === 'fulfilled') {
      tableStructure = tableStructureResult.value;
    } else {
      errors.push(tableStructureResult.reason);
    }
    if (primaryColumnsResult.status === 'fulfilled') {
      primaryColumns = primaryColumnsResult.value;
    } else {
      errors.push(primaryColumnsResult.reason);
    }
    if (tableSettingsResult.status === 'fulfilled') {
      tableSettings = tableSettingsResult.value;
    } else {
      errors.push(tableSettingsResult.reason);
    }

    if (errors.length > 0) {
      throw new UnknownSQLException(
        errors.map((error) => error.message).join('\n'),
        ExceptionOperations.FAILED_TO_DELETE_ROWS_FROM_TABLE,
      );
    }

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

    const deleteOperationsResults: Array<DeleteRowsFromTableResult> = [];

    const queue = new PQueue({ concurrency: 5 });
    const deleteRowsResults: Array<DeleteRowsFromTableResult | void> = await Promise.all(
      primaryKeys.map(async (primaryKey) => {
        return await queue.add(async () => {
          return await this.deleteRowFromTable(dao, tableName, primaryKey, oldRowsData, userEmail);
        });
      }),
    );
    const deletionErrors: Array<string> = [];
    for (const result of deleteRowsResults) {
      if (result) {
        deleteOperationsResults.push(result);
        if (result.error) {
          deletionErrors.push(result.error);
        }
      }
    }

    try {
      if (deletionErrors.length > 0) {
        throw new HttpException(
          {
            message: Messages.BULK_DELETE_FAILED_DELETE_ROWS(deletionErrors),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return true;
    } catch (error) {
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

  private async deleteRowFromTable(
    dataAccessObject: IDataAccessObject | IDataAccessObjectAgent,
    tableName: string,
    primaryKey: Record<string, unknown>,
    oldRowsData: Array<Record<string, unknown>>,
    userEmail: string,
  ): Promise<DeleteRowsFromTableResult> {
    let operationResult = OperationResultStatusEnum.unknown;
    try {
      await dataAccessObject.deleteRowInTable(tableName, primaryKey, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      return {
        operationStatusResult: operationResult,
        row: primaryKey,
        old_data: findObjectsWithProperties(oldRowsData, primaryKey).at(0),
        error: null,
      };
    } catch (error) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      return {
        operationStatusResult: operationResult,
        row: primaryKey,
        old_data: findObjectsWithProperties(oldRowsData, primaryKey).at(0),
        error: error.message,
      };
    }
  }
}
