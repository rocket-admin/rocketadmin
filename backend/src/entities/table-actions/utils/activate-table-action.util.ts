import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableActionEntity } from '../table-action.entity.js';
import axios from 'axios';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { HttpException } from '@nestjs/common';
import PQueue from 'p-queue';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';

export type ActionActivationResult = {
  location?: string;
  receivedOperationResult: OperationResultStatusEnum;
  receivedPrimaryKeysObj: Array<Record<string, unknown>>;
};

export async function activateTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Array<Record<string, unknown>>,
  userId: string,
  tableName: string,
): Promise<ActionActivationResult> {
  switch (tableAction.method) {
    case TableActionMethodEnum.HTTP:
      return activateHttpTableAction(tableAction, foundConnection, request_body, userId, tableName);
    default:
      throw new Error(`Method ${tableAction.method} is not supported`);
  }
}

async function activateHttpTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Array<Record<string, unknown>>,
  userId: string,
  tableName: string,
): Promise<{
  location?: string;
  receivedOperationResult: OperationResultStatusEnum;
  receivedPrimaryKeysObj: Array<Record<string, unknown>>;
}> {
  let operationResult = OperationResultStatusEnum.unknown;
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
  const actionRequestBody = JSON.stringify({
    $$_raUserId: userId,
    primaryKeys: primaryKeyValuesArray,
    $$_date: dateString,
    $$_actionId: tableAction.id,
    $$_tableName: tableName,
  });
  const autoadminSignatureHeader = Encryptor.hashDataHMACexternalKey(foundConnection.signing_key, actionRequestBody);
  const result = await axios.post(tableAction.url, actionRequestBody, {
    headers: { 'Rocketadmin-Signature': autoadminSignatureHeader, 'Content-Type': 'application/json' },
    maxRedirects: 0,
    validateStatus: function (status) {
      return status <= 599;
    },
  });
  const operationStatusCode = result.status;
  if (operationStatusCode >= 200 && operationStatusCode < 300) {
    operationResult = OperationResultStatusEnum.successfully;
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }
  if (operationStatusCode >= 300 && operationStatusCode < 400) {
    operationResult = OperationResultStatusEnum.successfully;
    return {
      receivedOperationResult: operationResult,
      location: result?.headers?.location,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
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
    receivedPrimaryKeysObj: primaryKeyValuesArray,
  };
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
          .add(() => activateTableAction(tableAction, connection, [request_body], userId, tableName))
          .catch((error) => {
            console.error('Error in activateTableActions', error);
          }),
      ),
    );
  } catch (error) {
    return;
  }
}
