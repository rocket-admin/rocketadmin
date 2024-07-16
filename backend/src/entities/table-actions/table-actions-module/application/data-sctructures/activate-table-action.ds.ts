export class ActivateTableActionDS {
  connectionId: string;
  userId: string;
  masterPwd: string;
  tableName: string;
  actionId: string;
  confirmed: boolean;
  request_body: Record<string, unknown>;
}