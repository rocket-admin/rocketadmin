import { TableTriggerEventEnum } from '../../../../enums/table-trigger-event-enum.js';

export class CreateTableTriggersDS {
  connectionId: string;
  tableName: string;
  actions_ids: Array<string>;
  trigger_events: Array<TableTriggerEventEnum>;
}
