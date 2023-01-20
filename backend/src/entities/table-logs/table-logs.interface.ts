import { IPaginationRO } from '../table/table.interface.js';
import { LogOperationTypeEnum } from '../../enums/index.js';
import { OperationResultStatusEnum } from '../../enums/index.js';

export interface ITableLogRO {
  table_name: string;
  received_data: string;
  cognitoUserName: string;
  email: string;
  operationType: LogOperationTypeEnum;
  operationStatusResult: OperationResultStatusEnum;
  createdAt: string;
  connection_id: string;
}

export interface ITableLogsRO {
  logs: Array<ITableLogRO>;
  pagination: IPaginationRO;
}
