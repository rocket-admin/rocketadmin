import { TableActionTypeEnum } from '../../../../enums/index.js';

export class UpdateTableActionDS {
  actionId: string;
  title: string;
  type: TableActionTypeEnum;
  url: string;
  icon: string;
  requireConfirmation: boolean;
}
