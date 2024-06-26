import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class UpdateTableActionDS {
  actionId: string;
  title: string;
  type: TableActionTypeEnum;
  url: string;
  icon: string;
  requireConfirmation: boolean;
  method: TableActionMethodEnum;
  slack_url: string;
  emails: string[];
  userId: string;
}
