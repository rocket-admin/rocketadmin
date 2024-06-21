import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';

export class CreateTableTriggersDS {
  connectionId: string;
  tableName: string;
  actions_ids: Array<string>;
  trigger_events: Array<TableActionEventEnum>;
}
