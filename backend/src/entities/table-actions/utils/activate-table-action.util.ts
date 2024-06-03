import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableActionEntity } from '../table-action.entity.js';
import axios from 'axios';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { HttpException } from '@nestjs/common';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import PQueue from 'p-queue';

export async function activateTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Record<string, unknown>,
  userId: string,
  tableName: string,
): Promise<{
  location?: string;
  receivedOperationResult: OperationResultStatusEnum;
  receivedPrimaryKeysObj: Record<string, unknown>;
}> {
  let operationResult = OperationResultStatusEnum.unknown;
  const dataAccessObject = getDataAccessObject(foundConnection);
  const tablePrimaryKeys = await dataAccessObject.getTablePrimaryColumns(tableName, null);
  const primaryKeysObj = getPrimaryKeysFromBody(request_body, tablePrimaryKeys);
  const dateString = new Date().toISOString();
  const actionRequestBody = JSON.stringify({
    $$_raUserId: userId,
    primaryKeys: primaryKeysObj,
    $$_date: dateString,
    $$_actionId: tableAction.id,
    $$_tableName: tableName,
  });
  const autoadminSignatureHeader = Encryptor.hashDataHMACexternalKey(foundConnection.signing_key, actionRequestBody);
  const result = await axios.post(tableAction.url, actionRequestBody, {
    headers: { 'Rocketadmin-Signature': autoadminSignatureHeader, 'Content-Type': 'application/json' },
    maxRedirects: 0,
    validateStatus: function (status) {
      return status >= 200 && status <= 302;
    },
  });
  const operationStatusCode = result.status;
  if (operationStatusCode >= 200 && operationStatusCode < 300) {
    operationResult = OperationResultStatusEnum.successfully;
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeysObj,
    };
  }
  if (operationStatusCode >= 300 && operationStatusCode < 400) {
    operationResult = OperationResultStatusEnum.successfully;
    return {
      receivedOperationResult: operationResult,
      location: result?.headers?.location,
      receivedPrimaryKeysObj: primaryKeysObj,
    };
  }
  if (operationStatusCode >= 400 && operationStatusCode <= 599) {
    throw new HttpException(
      {
        message: result.data,
      },
      operationStatusCode,
    );
  }
  return {
    receivedOperationResult: operationResult,
    receivedPrimaryKeysObj: primaryKeysObj,
  };
}

function getPrimaryKeysFromBody(
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

export async function activateTableActions(
  tableActions: Array<TableActionEntity>,
  connection: ConnectionEntity,
  request_body: Record<string, unknown>,
  userId: string,
  tableName: string,
): Promise<void> {
  if (!tableActions.length) {
    return;
  }
  try {
    const queue = new PQueue({ concurrency: 2 });
    await Promise.all(
      tableActions.map((tableAction) =>
        queue
          .add(() => activateTableAction(tableAction, connection, request_body, userId, tableName))
          .catch((error) => {
            console.error('Error in activateTableActions', error);
          }),
      ),
    );
  } catch (error) {
    return;
  }
}
