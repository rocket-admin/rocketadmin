import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { ActivateTableActionsDS } from '../application/data-sctructures/activate-table-actions.ds.js';
import { ActivatedTableActionsDS } from '../application/data-sctructures/activated-table-action.ds.js';
import { IActivateTableActions } from './table-actions-use-cases.interface.js';

@Injectable()
export class ActivateTableActionsUseCase
  extends AbstractUseCase<ActivateTableActionsDS, ActivatedTableActionsDS>
  implements IActivateTableActions
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: ActivateTableActionsDS): Promise<ActivatedTableActionsDS> {
    let operationResult = OperationResultStatusEnum.unknown;
    const { actionId, request_body, connectionId, masterPwd, tableName, userId, confirmed } = inputData;
    const foundTableAction = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableAction) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (foundTableAction.require_confirmation && !confirmed) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_CONFIRMATION_REQUIRED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );

    const dataAccessObject = getDataAccessObject(foundConnection);
    const tablePrimaryKeys = await dataAccessObject.getTablePrimaryColumns(tableName, null);
    const primaryKeyValuesArray: Array<Record<string, unknown>> = [];
    for (const primaryKeyInBody of request_body) {
      for (const primaryKey of tablePrimaryKeys) {
        const pKeysObj: Record<string, unknown> = {};
        if (primaryKeyInBody.hasOwnProperty(primaryKey.column_name) && primaryKeyInBody[primaryKey.column_name]) {
          pKeysObj[primaryKey.column_name] = primaryKeyInBody[primaryKey.column_name];
          primaryKeyValuesArray.push(pKeysObj);
        }
      }
    }

    const dateString = new Date().toISOString();

    const requestBody = {
      $$_raUserId: userId,
      primaryKeys: primaryKeyValuesArray,
      $$_date: dateString,
      $$_actionId: actionId,
      $$_tableName: tableName,
    };

    const bodyString = JSON.stringify(requestBody);

    const rocketadminSignatureHeader = Encryptor.hashDataHMACexternalKey(foundConnection.signing_key, bodyString);

    try {
      const result = await axios.post(foundTableAction.url, bodyString, {
        headers: {
          'Rocketadmin-Signature': rocketadminSignatureHeader,
          'Content-Type': 'application/json',
        },
      });

      const operationStatusCode = result.status;
      if (operationStatusCode >= 200 && operationStatusCode < 300) {
        operationResult = OperationResultStatusEnum.successfully;
        return result.data;
      }
      if (operationStatusCode >= 300 && operationStatusCode < 400) {
        operationResult = OperationResultStatusEnum.successfully;
        return { location: result.data } as unknown as ActivatedTableActionsDS;
      }
      if (operationStatusCode >= 400 && operationStatusCode <= 599) {
        operationResult = OperationResultStatusEnum.unsuccessfully;
        throw new HttpException(
          {
            message: result.data,
          },
          operationStatusCode,
        );
      }
      return;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      throw new HttpException(
        {
          message: e.message,
        },
        e.response?.status || HttpStatus.BAD_REQUEST,
      );
    } finally {
      const logRecord = {
        table_name: tableName,
        userId: userId,
        connection: foundConnection,
        operationType: LogOperationTypeEnum.actionActivated,
        operationStatusResult: operationResult,
        row: { keys: primaryKeyValuesArray },
        old_data: null,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
    }
  }
}
