import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class CreateTableActionDS {
  connectionId: string;
  title: string;
  type: TableActionTypeEnum;
  url: string;
  tableName: string;
  masterPwd: string;
  userId: string;
  icon: string;
  requireConfirmation: boolean;
  method: TableActionMethodEnum;
  slackChannel: string;
  slackBotToken: string;
  emails: string[];
}
