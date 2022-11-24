import { TableActionTypeEnum } from '../../../../enums';

export class CreateTableActionDS {
  connectionId: string;
  title: string;
  type: TableActionTypeEnum;
  url: string;
  tableName: string;
  masterPwd: string;
  userId: string;
  icon: string;
}
