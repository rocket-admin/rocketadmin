import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { LogOperationTypeEnum } from '../../../enums/log-operation-type.enum';

export class CreateLogRecordDto {
  table_name: string;
  operationType: LogOperationTypeEnum;
  operationStatusResult: OperationResultStatusEnum;
  row?: string;
  old_data?: any;
  email: string;
}