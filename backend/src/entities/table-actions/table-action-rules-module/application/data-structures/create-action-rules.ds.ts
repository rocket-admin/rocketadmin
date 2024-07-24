import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';
import { TableActionMethodEnum } from '../../../../../enums/table-action-method-enum.js';
import { TableActionTypeEnum } from '../../../../../enums/table-action-type.enum.js';

export class CreateTableActionData {
  action_url: string;
  action_method: TableActionMethodEnum;
  action_slack_url: string;
  action_emails: Array<string>;
}

export class CreateTableActionEventDS {
  event: TableActionEventEnum;
  event_title: string;
  icon: string;
  require_confirmation: boolean;
  type: TableActionTypeEnum;
}

export class CreateRuleDataDs {
  rule_title: string;
  table_name: string;
}

export class CreateActionRuleDS {
  rule_data: CreateRuleDataDs;
  connection_data: {
    connectionId: string;
    masterPwd: string;
    userId: string;
  };
  table_actions_data: Array<CreateTableActionData>;
  action_events_data: Array<CreateTableActionEventDS>;
}
