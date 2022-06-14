import { IPaginationRO } from '../table/table.interface';
import { LogOperationTypeEnum } from '../../enums';
import { OperationResultStatusEnum } from '../../enums';

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
