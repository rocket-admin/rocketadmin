import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object.js';
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
    const dataAccessObject = createDataAccessObject(foundConnection, userId);
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
    const autoadminSignatureHeader = this.generateAutoadminSignature(
      foundConnection.signing_key,
      primaryKeyValuesArray,
      actionId,
      dateString,
      tableName,
    );

    try {
      const result = await axios.post(
        foundTableAction.url,
        {
          $$_raUserId: userId,
          primaryKeys: primaryKeyValuesArray,
          $$_date: dateString,
          $$_actionId: actionId,
          $$_tableName: tableName,
        },
        {
          headers: { 'Rocketadmin-Signature': autoadminSignatureHeader },
        },
      );
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
  private generateAutoadminSignature(
    signingKey: string,
    primaryKeys: Array<Record<string, unknown>>,
    actionId: string,
    dateString: string,
    tableName: string,
  ): string {
    let stringifyedPKeys: string;
    for (const pKeys of primaryKeys) {
      stringifyedPKeys = this.objToString(pKeys);
    }
    const strTohash = dateString + '$$' + stringifyedPKeys + '$$' + actionId + '$$' + tableName;
    const hash = Encryptor.hashDataHMACexternalKey(signingKey, strTohash);
    return hash;
  }

  private objToString(obj: Record<string, unknown>): string {
    return Object.entries(obj)
      .reduce((str, [p, val]) => {
        return `${str}${p}::${val}\n`;
      }, '')
      .slice(0, -1);
  }
}
