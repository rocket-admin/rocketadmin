import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { LogOperationTypeEnum, OperationResultStatusEnum } from '../../../../enums/index.js';

export class CreateLogRecordDs {
  connection: ConnectionEntity;
  old_data?: unknown;
  operationStatusResult: OperationResultStatusEnum;
  operationType: LogOperationTypeEnum;
  row?: string | Record<string, unknown>;
  table_name: string;
  userId: string;
  affected_primary_key?: string | Record<string, unknown>;
}
