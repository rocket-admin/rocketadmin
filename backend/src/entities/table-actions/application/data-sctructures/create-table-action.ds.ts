import { TableActionTypeEnum } from '../../../../enums/index.js';

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
}
