import { ConnectionEntity } from '../../connection/connection.entity.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';

export class CreateLogRecordDto {
  table_name: string;
  cognitoUserName: string;
  connection: ConnectionEntity;
  operationType: LogOperationTypeEnum;
  operationStatusResult: OperationResultStatusEnum;
  row?: string;
  old_data?: any;
}
