import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { TableActionTypeEnum } from '../../../../enums/table-action-type.enum.js';

export class CreateTableActionData {
  action_type: TableActionTypeEnum;
  action_url: string;
  action_method: TableActionMethodEnum;
  action_slack_url: string;
  action_emails: Array<string>;
}

export class ActionRuleData {
  table_name: string;
  title: string;
  events_data: Array<CreateTableActionEventDS>;
}

export class CreateTableActionEventDS {
  event: TableActionEventEnum;
  event_title: string;
  icon: string;
  require_confirmation: boolean;
}

export class CreateTableActionWithEventAndRuleDS {
  connection_data: {
    connectionId: string;
    masterPwd: string;
    userId: string;
  };
  table_action_data: CreateTableActionData;
  action_rules_data: Array<ActionRuleData>;
}
