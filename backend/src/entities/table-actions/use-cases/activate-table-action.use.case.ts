import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';
import { IPrimaryKey } from '../../../data-access-layer/shared/data-access-object-interface';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { TableLogsService } from '../../table-logs/table-logs.service';
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds';
import { IActivateTableAction } from './table-actions-use-cases.interface';

@Injectable()
export class ActivateTableActionUseCase
  extends AbstractUseCase<ActivateTableActionDS, void>
  implements IActivateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: ActivateTableActionDS): Promise<void> {
    let operationResult = OperationResultStatusEnum.unknown;
    const { actionId, request_body, connectionId, masterPwd, tableName, userId } = inputData;
    const foundTableAction = await this._dbContext.tableActionRepository.findTableActionById(actionId);
    if (!foundTableAction) {
      throw new HttpException(
        {
          message: Messages.TABLE_ACTION_NOT_FOUND,
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
        { ...primaryKeysObj, $$_date: dateString, $$_actionId: actionId, $$_tableName: tableName },
        {
          headers: { 'Rocketadmin-Signature': autoadminSignatureHeader },
        },
      );
      operationResult =
        result.status >= 200 && result.status < 300
          ? OperationResultStatusEnum.successfully
          : OperationResultStatusEnum.unsuccessfully;
      return;
    } catch (e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
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
    primaryKeys: Array<IPrimaryKey>,
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
    const hash = Encryptor.hashDataHMACexternalKey(signingKey, JSON.stringify(strTohash));
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
