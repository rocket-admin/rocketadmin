import { CreateLogRecordDs } from '../application/data-structures/create-log-record.ds.js';
import { TableLogsEntity } from '../table-logs.entity.js';

export function buildTableLogsEntity(logData: CreateLogRecordDs, userEmail: string): TableLogsEntity {
  const { connection, old_data, operationStatusResult, operationType, row, table_name, userId } = logData;
  const newLogs = new TableLogsEntity();
  newLogs.received_data = row as string;
  newLogs.table_name = table_name;
  newLogs.cognitoUserName = userId;
  newLogs.email = userEmail;
  newLogs.createdAt = new Date();
  newLogs.operationType = operationType;
  newLogs.operationStatusResult = operationStatusResult;
  newLogs.connection_id = connection;
  newLogs.old_data = old_data as string;
  return newLogs;
}
