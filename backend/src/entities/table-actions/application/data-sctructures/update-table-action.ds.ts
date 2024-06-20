import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class UpdateTableActionDS {
  actionId: string;
  type: TableActionTypeEnum;
  url: string;
  method: TableActionMethodEnum;
  slack_url: string;
  emails: string[];
  userId: string;
}
