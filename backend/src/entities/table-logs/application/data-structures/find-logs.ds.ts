import { LogOperationTypeEnum } from "../../../../enums";

export class FindLogsDs {
  connectionId: string;
  query: string;
  userId: string;
  operationTypes: Array<LogOperationTypeEnum>;
}
