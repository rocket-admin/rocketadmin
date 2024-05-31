import { TableTriggerEventEnum } from '../../../../enums/table-trigger-event-enum.js';

export class UpdateTableTriggersDS {
  actions_ids: Array<string>;
  trigger_events: Array<TableTriggerEventEnum>;
  triggersId: string;
  table_name: string;
}
