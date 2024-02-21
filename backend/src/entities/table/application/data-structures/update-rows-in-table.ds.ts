export class UpdateRowsInTableDs {
  connectionId: string;
  masterPwd: string;
  tableName: string;
  userId: string;
  primaryKeys: Array<Record<string, unknown>>;
  newValues: Record<string, unknown>;
}
