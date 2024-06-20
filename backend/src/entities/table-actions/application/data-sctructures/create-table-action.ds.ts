import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class CreateTableActionDS {
  connectionId: string;
  type: TableActionTypeEnum;
  url: string;
  tableName: string;
  masterPwd: string;
  userId: string;
  method: TableActionMethodEnum;
  slack_url: string;
  emails: string[];
}
