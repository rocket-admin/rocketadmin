import { QueryOrderingEnum } from '../../../shared/enums/query-ordering.enum.js';
import { CustomFieldDS } from './custom-field.ds.js';
import { TableWidgetDS } from './table-widget.ds.js';

export class ValidateTableSettingsDS {
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
  custom_fields?: Array<CustomFieldDS>;
  table_widgets?: Array<TableWidgetDS>;
  columns_view?: Array<string>;
  icon?: string;
}
