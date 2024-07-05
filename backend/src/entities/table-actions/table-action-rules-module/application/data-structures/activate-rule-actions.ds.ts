export class ActivateEventActionsDS {
  connection_data: {
    connectionId: string;
    masterPwd: string;
    userId: string;
  };
  event_id: string;
  request_body: Array<Record<string, unknown>>;
}
