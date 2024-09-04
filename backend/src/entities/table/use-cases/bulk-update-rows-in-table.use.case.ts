import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { UpdateRowsInTableDs } from '../application/data-structures/update-rows-in-table.ds.js';
import { IBulkUpdateRowsInTable } from './table-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { LogOperationTypeEnum } from '../../../enums/log-operation-type.enum.js';

@Injectable()
export class BulkUpdateRowsInTableUseCase
  extends AbstractUseCase<UpdateRowsInTableDs, SuccessResponse>
  implements IBulkUpdateRowsInTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateRowsInTableDs): Promise<SuccessResponse> {
    const { connectionId, masterPwd, newValues, primaryKeys, tableName, userId } = inputData;
    let operationResult = OperationResultStatusEnum.unknown;

    if (!primaryKeys?.length) {
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

    const [tableStructure, primaryColumns, tableSettings, tableWidgets] = await Promise.all([
      dao.getTableStructure(tableName, userEmail),
      dao.getTablePrimaryColumns(tableName, userEmail),
      this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
      this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
    ]);

    primaryKeys.forEach((primaryKey) => {
      convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
    });

    const availablePrimaryColumns: Array<string> = primaryColumns.map((column) => column.column_name);

    for (const key of primaryKeys) {
      const receivedPrimaryColumns = Object.keys(key);
      if (!availablePrimaryColumns.every((column) => receivedPrimaryColumns.includes(column))) {
        throw new HttpException(
          {
            message: Messages.PRIMARY_KEY_MISSING_PARAMETER_OR_INCORRECT,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const oldRowsData: Array<Record<string, unknown>> = await Promise.all(
      primaryKeys.map((primaryKey) => dao.getRowByPrimaryKey(tableName, primaryKey, tableSettings, userEmail)),
    );

    try {
      let processedNewValues = await hashPasswordsInRowUtil(newValues, tableWidgets);
      processedNewValues = processUuidsInRowUtil(processedNewValues, tableWidgets);
      await dao.bulkUpdateRowsInTable(tableName, processedNewValues, primaryKeys, userEmail);
      operationResult = OperationResultStatusEnum.successfully;
      return {
        success: true,
      };
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_UPDATE_ROWS_IN_TABLE);
    } finally {
      const logsData = oldRowsData.map((oldRowData) => {
        return {
          operationStatusResult: operationResult,
          row: newValues,
          old_data: oldRowData,
          affected_primary_key: primaryKeys as unknown as string,
        };
      });
      await this.tableLogsService.createAndSaveNewLogsUtil(
        logsData,
        userId,
        connection,
        tableName,
        LogOperationTypeEnum.updateRow,
      );
    }
  }
}
