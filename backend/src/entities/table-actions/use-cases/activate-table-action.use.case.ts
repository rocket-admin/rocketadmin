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
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds.js';
import { ActivatedTableActionDS } from '../application/data-sctructures/activated-table-action.ds.js';
import { IActivateTableAction } from './table-actions-use-cases.interface.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';

@Injectable()
export class ActivateTableActionUseCase
  extends AbstractUseCase<ActivateTableActionDS, ActivatedTableActionDS>
  implements IActivateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: ActivateTableActionDS): Promise<ActivatedTableActionDS> {
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
    const primaryKeysObj = this.getPrimaryKeysFromBody(request_body, tablePrimaryKeys);
    const dateString = new Date().toISOString();
    const autoadminSignatureHeader = this.generateAutoadminSignature(
      foundConnection.signing_key,
      primaryKeysObj,
      actionId,
      dateString,
      tableName,
    );
    try {
      const result = await axios.post(
        foundTableAction.url,
        {
          $$_raUserId: userId,
          primaryKeys: primaryKeysObj,
          $$_date: dateString,
          $$_actionId: actionId,
          $$_tableName: tableName,
        },
        {
          headers: { 'Rocketadmin-Signature': autoadminSignatureHeader },
          maxRedirects: 0,
          validateStatus: function (status) {
            return status >= 200 && status <= 302;
          },
        },
      );
      const operationStatusCode = result.status;
      if (operationStatusCode >= 200 && operationStatusCode < 300) {
        operationResult = OperationResultStatusEnum.successfully;
        return;
      }
      if (operationStatusCode >= 300 && operationStatusCode < 400) {
        operationResult = OperationResultStatusEnum.successfully;
        return { location: result?.headers?.location };
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
        row: primaryKeysObj,
        old_data: null,
      };
      await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
    }
  }

  private getPrimaryKeysFromBody(
    body: Record<string, unknown>,
    primaryKeys: Array<PrimaryKeyDS>,
  ): Record<string, unknown> {
    const pKeysObj: Record<string, unknown> = {};
    for (const keyItem of primaryKeys) {
      if (body.hasOwnProperty(keyItem.column_name) && body[keyItem.column_name]) {
        pKeysObj[keyItem.column_name] = body[keyItem.column_name];
      }
    }
    return pKeysObj;
  }

  private generateAutoadminSignature(
    signingKey: string,
    primaryKeys: Record<string, unknown>,
    actionId: string,
    dateString: string,
    tableName: string,
  ): string {
    const stringifyedPKeys = this.objToString(primaryKeys);
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
