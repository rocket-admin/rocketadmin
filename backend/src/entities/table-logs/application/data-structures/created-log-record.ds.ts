import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../../enums/index.js';

export class CreatedLogRecordDs {
  connection_id: string;
  createdAt: Date;
  email: string;
  id: string;
  old_data: string;
  operationStatusResult!: OperationResultStatusEnum;
  operationType: LogOperationTypeEnum;
  received_data: string;
  table_name: string;
  userId: string;
}
