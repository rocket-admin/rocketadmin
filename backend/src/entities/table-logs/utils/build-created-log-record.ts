import { TableLogsEntity } from '../table-logs.entity';
import { CreatedLogRecordDs } from '../application/data-structures/created-log-record.ds';

export function buildCreatedLogRecord(log: TableLogsEntity): CreatedLogRecordDs {
  const {
    cognitoUserName,
    connection_id,
    createdAt,
    email,
    id,
    old_data,
    operationStatusResult,
    operationType,
    received_data,
    table_name,
  } = log;
  return {
    createdAt: createdAt,
    email: email,
    id: id,
    old_data: old_data,
    operationStatusResult: operationStatusResult,
    operationType: operationType,
    received_data: received_data,
    table_name: table_name,
    connection_id: connection_id as unknown as string,
    userId: cognitoUserName,
  };
}
