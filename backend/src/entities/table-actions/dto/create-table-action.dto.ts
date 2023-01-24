import { TableActionTypeEnum } from '../../../enums/index.js';

export class CreateTableActionDTO {
  title: string;

  type: TableActionTypeEnum;

  url: string;

  tableName: string;

  icon: string;

  requireConfirmation: boolean;
}

export class ActivateTableActionDTO {}
