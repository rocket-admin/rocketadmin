import { TableActionTypeEnum } from '../../../../enums/index.js';

export class CreatedTableActionDS {
  id: string;
  title: string;
  type: TableActionTypeEnum;
  url: string;
  icon: string;
  requireConfirmation: boolean;
}
