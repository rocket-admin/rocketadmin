export class ActivateTableActionsDS {
  connectionId: string;
  userId: string;
  masterPwd: string;
  tableName: string;
  actionId: string;
  confirmed: boolean;
  request_body: Array<Record<string, unknown>>;
}