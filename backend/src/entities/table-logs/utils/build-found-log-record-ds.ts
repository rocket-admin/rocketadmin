import { FoundLogRecordDs } from '../application/data-structures/found-logs.ds.js';
import { TableLogsEntity } from '../table-logs.entity.js';

export function buildFoundLogRecordDs(log: TableLogsEntity): FoundLogRecordDs {
  const {
    cognitoUserName,
    connection_id,
    createdAt,
    email,
    old_data,
    operationStatusResult,
    operationType,
    received_data,
    table_name,
    affected_primary_key,
  } = log;
  return {
    table_name: table_name,
    received_data: received_data,
    old_data: old_data,
    cognitoUserName: cognitoUserName,
    email: email,
    operationType: operationType,
    operationStatusResult: operationStatusResult,
    createdAt: createdAt,
    connection_id: connection_id.id,
    affected_primary_key: affected_primary_key,
  };
}
