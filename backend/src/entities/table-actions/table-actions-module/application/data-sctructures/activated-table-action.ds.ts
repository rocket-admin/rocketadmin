import { OperationResultStatusEnum } from '../../../../../enums/index.js';

export type ActivatedTableActionDS = void | { location: string };
export type ActivatedTableActionsDS =
  | OperationResultStatusEnum
  | { location: string }
  | void
  | { success: OperationResultStatusEnum };
