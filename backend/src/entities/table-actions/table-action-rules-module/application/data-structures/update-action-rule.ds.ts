import { CreateRuleDataDs, CreateTableActionData, CreateTableActionEventDS } from './create-action-rules.ds.js';

export class UpdateRuleDataDs extends CreateRuleDataDs {
  rule_id: string;
}

export class UpdateTableActionData extends CreateTableActionData {
  action_id?: string;
}

export class UpdateTableActionEventDS extends CreateTableActionEventDS {
  event_id?: string;
}

export class UpdateActionRuleDS {
  rule_data: UpdateRuleDataDs;
  connection_data: {
    connectionId: string;
    masterPwd: string;
    userId: string;
  };
  table_actions_data: Array<UpdateTableActionData>;
  action_events_data: Array<UpdateTableActionEventDS>;
}
