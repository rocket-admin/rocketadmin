import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { Encryptor } from '../../../../helpers/encryption/encryptor.js';
import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { TableActionEntity } from '../table-action.entity.js';
import axios from 'axios';
import { OperationResultStatusEnum } from '../../../../enums/operation-result-status.enum.js';
import { HttpException } from '@nestjs/common';
import PQueue from 'p-queue';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';
import { actionSlackPostMessage } from '../../../../helpers/slack/action-slack-post-message.js';
import { IMessage } from '../../../email/email/email.interface.js';
import { Constants } from '../../../../helpers/constants/constants.js';
import { getProcessVariable } from '../../../../helpers/get-process-variable.js';
import { sendEmailToUser } from '../../../email/send-email.js';

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
  triggerOperation: TableActionEventEnum,
): Promise<ActionActivationResult> {
  switch (tableAction.method) {
    case TableActionMethodEnum.URL:
      return await activateHttpTableAction(tableAction, foundConnection, request_body, userId, tableName);
    case TableActionMethodEnum.SLACK:
      return await activateSlackTableAction(
        tableAction,
        foundConnection,
        request_body,
        userId,
        tableName,
        triggerOperation,
      );
    case TableActionMethodEnum.EMAIL:
      return await activateEmailTableAction(
        tableAction,
        foundConnection,
        request_body,
        userId,
        tableName,
        triggerOperation,
      );
    default:
      throw new Error(`Method ${tableAction.method} is not supported`);
  }
}

async function activateSlackTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Array<Record<string, unknown>>,
  userId: string,
  tableName: string,
  triggerOperation?: TableActionEventEnum,
): Promise<ActionActivationResult> {
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
  const slackMessage = `User with id "${userId}" ${
    triggerOperation === TableActionEventEnum.ADD_ROW
      ? 'added'
      : triggerOperation === TableActionEventEnum.UPDATE_ROW
        ? 'updated'
        : triggerOperation === TableActionEventEnum.DELETE_ROW
          ? 'deleted'
          : 'performed an action on'
  } a row in table "${tableName}" with primary keys: ${JSON.stringify(primaryKeyValuesArray)}`;

  try {
    await actionSlackPostMessage(slackMessage, tableAction.slack_url);
    operationResult = OperationResultStatusEnum.successfully;
  } catch (e) {
    operationResult = OperationResultStatusEnum.unsuccessfully;
  }
  return {
    receivedOperationResult: operationResult,
    receivedPrimaryKeysObj: primaryKeyValuesArray,
  };
}

async function activateEmailTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Array<Record<string, unknown>>,
  userId: string,
  tableName: string,
  triggerOperation: TableActionEventEnum,
): Promise<ActionActivationResult> {
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
  const emailMessage = `User with id "${userId}" ${
    triggerOperation === TableActionEventEnum.ADD_ROW
      ? 'added'
      : triggerOperation === TableActionEventEnum.UPDATE_ROW
        ? 'updated'
        : triggerOperation === TableActionEventEnum.DELETE_ROW
          ? 'deleted'
          : 'performed an action on'
  } a row in table "${tableName}" with primary keys: ${JSON.stringify(primaryKeyValuesArray)}`;

  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;

  const queue = new PQueue({ concurrency: 2 });
  try {
    await Promise.all(
      tableAction.emails.map((email) =>
        queue.add(() => {
          const letterContent: IMessage = {
            from: emailFrom,
            to: email,
            subject: 'Rocketadmin action notification',
            text: emailMessage,
            html: emailMessage,
          };
          return sendEmailToUser(letterContent);
        }),
      ),
    );
    operationResult = OperationResultStatusEnum.successfully;
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  } catch (error) {
    operationResult = OperationResultStatusEnum.unsuccessfully;
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }
}

async function activateHttpTableAction(
  tableAction: TableActionEntity,
  foundConnection: ConnectionEntity,
  request_body: Array<Record<string, unknown>>,
  userId: string,
  tableName: string,
): Promise<ActionActivationResult> {
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
  triggerOperation: TableActionEventEnum,
): Promise<void> {
  if (!tableActions.length) {
    return;
  }
  try {
    const queue = new PQueue({ concurrency: 2 });
    await Promise.all(
      tableActions.map((tableAction) =>
        queue
          .add(() => activateTableAction(tableAction, connection, [request_body], userId, tableName, triggerOperation))
          .catch((error) => {
            console.error('Error in activateTableActions', error);
          }),
      ),
    );
  } catch (error) {
    return;
  }
}
