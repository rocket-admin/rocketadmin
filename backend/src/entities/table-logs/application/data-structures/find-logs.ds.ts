import { LogOperationTypeEnum } from '../../../../enums/index.js';

export class FindLogsDs {
  connectionId: string;
  query: string;
  userId: string;
  operationTypes: Array<LogOperationTypeEnum>;
}
