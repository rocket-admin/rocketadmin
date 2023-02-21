import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums';

export class CreateLogRecordDto {
  table_name: string;
  operationType: LogOperationTypeEnum;
  operationStatusResult: OperationResultStatusEnum;
  row?: string;
  old_data?: any;
  email: string;
}