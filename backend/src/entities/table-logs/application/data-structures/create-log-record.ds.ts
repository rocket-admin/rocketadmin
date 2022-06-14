import { ConnectionEntity } from '../../../connection/connection.entity';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../../enums';

export class CreateLogRecordDs {
  connection: ConnectionEntity;
  old_data?: unknown;
  operationStatusResult: OperationResultStatusEnum;
  operationType: LogOperationTypeEnum;
  row?: string;
  table_name: string;
  userId: string;
}
