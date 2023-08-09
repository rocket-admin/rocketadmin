import { CreatedTableActionDS } from "./created-table-action.ds.js";

export class FoundTableActionsDS {
  table_name: string;
  display_name: string;
  table_actions: Array<CreatedTableActionDS>;
}
