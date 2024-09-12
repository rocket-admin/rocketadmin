import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../user/user.entity.js';
import { TableActionEntity } from './table-action.entity.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { actionSlackPostMessage } from '../../../helpers/slack/action-slack-post-message.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { getProcessVariable } from '../../../helpers/get-process-variable.js';
import { IMessage } from '../../email/email/email.interface.js';
import { sendEmailToUser } from '../../email/send-email.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import axios, { AxiosResponse } from 'axios';
import PQueue from 'p-queue';
import { isSaaS } from '../../../helpers/app/is-saas.js';

export type ActionActivationResult = {
  location?: string;
  receivedOperationResult: OperationResultStatusEnum;
  receivedPrimaryKeysObj: Array<Record<string, unknown>>;
};

type MessageContent = {
  text: string;
  html: string;
};

type UserInfoMessageData = {
  userId: string;
  email: string;
  userName: string;
};

@Injectable()
export class TableActionActivationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  public async activateTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userId: string,
    tableName: string,
    triggerOperation: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    const userInfoMessageData: UserInfoMessageData = {
      userId,
      email: foundUser.email,
      userName: foundUser.name,
    };
    switch (tableAction.method) {
      case TableActionMethodEnum.URL:
        return await this.activateHttpTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
        );
      case TableActionMethodEnum.SLACK:
        return await this.activateSlackTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
          triggerOperation,
        );
      case TableActionMethodEnum.EMAIL:
        return await this.activateEmailTableAction(
          tableAction,
          foundConnection,
          request_body,
          userInfoMessageData,
          tableName,
          triggerOperation,
        );
      default:
        throw new Error(`Method ${tableAction.method} is not supported`);
    }
  }

  public async activateSlackTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
    triggerOperation?: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    let operationResult = OperationResultStatusEnum.unknown;
    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );

    const { text: slackMessage } = this.generateMessageContent(
      userInfo,
      triggerOperation,
      tableName,
      primaryKeyValuesArray,
    );

    try {
      await actionSlackPostMessage(slackMessage, tableAction.slack_url);
      operationResult = OperationResultStatusEnum.successfully;
    } catch (_e) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
    }
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }

  public async activateEmailTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
    triggerOperation: TableActionEventEnum,
  ): Promise<ActionActivationResult> {
    let operationResult = OperationResultStatusEnum.unknown;
    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );
    const { text, html } = this.generateMessageContent(userInfo, triggerOperation, tableName, primaryKeyValuesArray);

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
              text: text,
              html: html,
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
    } catch (_error) {
      operationResult = OperationResultStatusEnum.unsuccessfully;
      return {
        receivedOperationResult: operationResult,
        receivedPrimaryKeysObj: primaryKeyValuesArray,
      };
    }
  }

  public async activateHttpTableAction(
    tableAction: TableActionEntity,
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    userInfo: UserInfoMessageData,
    tableName: string,
  ): Promise<ActionActivationResult> {
    const { userId } = userInfo;
    let operationResult = OperationResultStatusEnum.unknown;

    const primaryKeyValuesArray: Array<Record<string, unknown>> = await this.getPrimaryKeysObjects(
      foundConnection,
      request_body,
      tableName,
    );

    const dateString = new Date().toISOString();
    const actionRequestBody = JSON.stringify({
      $$_raUserId: userId,
      primaryKeys: primaryKeyValuesArray,
      $$_date: dateString,
      $$_actionId: tableAction.id,
      $$_tableName: tableName,
    });
    const autoadminSignatureHeader = Encryptor.hashDataHMACexternalKey(foundConnection.signing_key, actionRequestBody);

    let result: AxiosResponse<any, any>;
    try {
      result = await axios.post(tableAction.url, actionRequestBody, {
        headers: { 'Rocketadmin-Signature': autoadminSignatureHeader, 'Content-Type': 'application/json' },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status <= 599;
        },
      });
      if (!isSaaS()) {
        console.info('HTTP action result data', result.data);
        console.info('HTTP action result status', result.status);
        console.info('HTTP action result headers', result.headers);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          result?.data?.error ||
          result?.data?.message ||
          result?.data?.errorMessage ||
          result?.data?.response ||
          'An error occurred';
        const responseStatus = error.response?.status || result?.status || 500;
        throw new HttpException(
          {
            message: errorMessage,
          },
          responseStatus,
        );
      }
      throw error;
    }
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
      const errorMessage =
        result?.data?.error ||
        result?.data?.message ||
        result?.data?.errorMessage ||
        result?.data?.response ||
        'An error occurred';
      throw new HttpException(
        {
          message: errorMessage,
        },
        operationStatusCode,
      );
    }
    return {
      receivedOperationResult: operationResult,
      receivedPrimaryKeysObj: primaryKeyValuesArray,
    };
  }

  public async activateTableActions(
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
            .add(() =>
              this.activateTableAction(tableAction, connection, [request_body], userId, tableName, triggerOperation),
            )
            .catch((error) => {
              console.error('Error in activateTableActions', error);
            }),
        ),
      );
    } catch (_error) {
      return;
    }
  }

  private async getPrimaryKeysObjects(
    foundConnection: ConnectionEntity,
    request_body: Array<Record<string, unknown>>,
    tableName: string,
  ): Promise<Array<Record<string, unknown>>> {
    const dataAccessObject = getDataAccessObject(foundConnection);
    const tablePrimaryKeys = await dataAccessObject.getTablePrimaryColumns(tableName, null);
    const primaryKeyValuesArray: Array<Record<string, unknown>> = [];
    for (const primaryKeyInBody of request_body) {
      const pKeysObj: Record<string, unknown> = {};
      for (const primaryKey of tablePrimaryKeys) {
        if (primaryKeyInBody.hasOwnProperty(primaryKey.column_name) && primaryKeyInBody[primaryKey.column_name]) {
          pKeysObj[primaryKey.column_name] = primaryKeyInBody[primaryKey.column_name];
        }
      }
      if (Object.keys(pKeysObj).length) {
        primaryKeyValuesArray.push(pKeysObj);
      }
    }

    return primaryKeyValuesArray;
  }

  private generateMessageContent(
    userInfo: UserInfoMessageData,
    triggerOperation: TableActionEventEnum,
    tableName: string,
    primaryKeyValuesArray: Array<Record<string, unknown>>,
  ): MessageContent {
    const { email, userId, userName } = userInfo;
    const action = triggerOperation === TableActionEventEnum.ADD_ROW
    ? 'added a row'
    : triggerOperation === TableActionEventEnum.UPDATE_ROW
      ? 'updated a row'
      : triggerOperation === TableActionEventEnum.DELETE_ROW
        ? 'deleted a row'
        : 'performed an action';
    const textContent = `${userName ? userName : 'User'} (email: ${email}, user id: ${userId}) has ${action} in the table "${tableName}".`;

    const htmlContent = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>You were added to a group on Rocketadmin</title>
  <style>
@media only screen and (max-width: 620px) {
  table[class=body] h1 {
    font-size: 28px !important;
    margin-bottom: 10px !important;
  }

  table[class=body] p,
table[class=body] ul,
table[class=body] ol,
table[class=body] td,
table[class=body] span,
table[class=body] a {
    font-size: 16px !important;
  }

  table[class=body] .wrapper,
table[class=body] .article {
    padding: 10px !important;
  }

  table[class=body] .content {
    padding: 0 !important;
  }

  table[class=body] .container {
    padding: 0 !important;
    width: 100% !important;
  }

  table[class=body] .main {
    border-left-width: 0 !important;
    border-radius: 0 !important;
    border-right-width: 0 !important;
  }

  table[class=body] .btn table {
    width: 100% !important;
  }

  table[class=body] .btn a {
    width: 100% !important;
  }

  table[class=body] .img-responsive {
    height: auto !important;
    max-width: 100% !important;
    width: auto !important;
  }
}
@media all {
  .ExternalClass {
    width: 100%;
  }

  .ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
    line-height: 100%;
  }
}
</style></head>
  <body class style="background-color: #f4e7ff; font-family: Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background-color: #f4e7ff; width: 100%;" width="100%" bgcolor="#f4e7ff">
      <tr>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
        <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; Margin: 0 auto;" width="580" valign="top">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">${action} in table "${tableName}"</span>
            <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; min-width: 100%; width: 100%;" width="100%">
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                        <a href="https://rocketadmin.com/" class="logo" style="color: #ec0867; text-decoration: underline; display: block; margin-bottom: 60px;">
                          <img src="https://app.rocketadmin.com/assets/rocketadmin_logo_black.png" height="30" alt="Rocketadmin logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%;">
                          </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                        <h1 class="title" style="font-size: 32px; font-weight: 600; line-height: 1.15; margin-top: 20px; margin-bottom: 40px;">Action notification</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                        <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">${textContent}</p>
                        <p style="font-size: 18px; font-weight: normal; margin: 0; margin-bottom: 15px;">Primary Keys: ${JSON.stringify(primaryKeyValuesArray)}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                        <p class="note" style="font-weight: normal; margin: 0; margin-bottom: 15px; font-size: 14px; margin-top: 40px;">
                          If you have any questions or need assistance, please feel free to reach out to our support team.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td class="footer" style="font-family: sans-serif; font-size: 14px; vertical-align: top; text-align: center; padding-top: 60px;" valign="top" align="center">
                        <span class="footer__content" style="font-size: 14px;">© 2024 Rocketadmin</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            <!-- END MAIN CONTENT AREA -->
            </table>
          <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`;
    return {
      text: textContent,
      html: htmlContent,
    };
  }
}
