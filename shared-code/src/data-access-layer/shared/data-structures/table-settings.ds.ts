import { QueryOrderingEnum } from '../../../shared/enums/query-ordering.enum.js';

export class TableSettingsDS {
  table_name: string;

  display_name: string;

  search_fields: Array<string>;

  excluded_fields: Array<string>;

  list_fields: Array<string>;

  identification_fields: Array<string>;

  list_per_page: number;

  ordering: QueryOrderingEnum;

  ordering_field: string;

  identity_column: string;

  readonly_fields: Array<string>;

  sortable_by: Array<string>;

  autocomplete_columns: Array<string>;

  columns_view: Array<string>;

  can_delete: boolean;

  can_update: boolean;

  can_add: boolean;

  sensitive_fields: Array<string>;
}
