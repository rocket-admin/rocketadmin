import { LogOperationTypeEnum } from '../../../../enums/index.js';

export class FindLogsDs {
  connectionId: string;
  query: Record<string, string>;
  userId: string;
  operationTypes: Array<LogOperationTypeEnum>;
}
