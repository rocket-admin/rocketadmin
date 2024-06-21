import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';

export class UpdateTableTriggersDS {
  actions_ids: Array<string>;
  trigger_events: Array<TableActionEventEnum>;
  triggersId: string;
  table_name: string;
}
