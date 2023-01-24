import { QueryOrderingEnum } from '../../../../enums/index.js';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class CreateTableSettingsDs {
  autocomplete_columns: Array<string>;
  columns_view?: Array<string>;
  connection_id: string;
  custom_fields?: Array<CustomFieldsEntity>;
  display_name: string;
  excluded_fields: Array<string>;
  identification_fields: Array<string>;
  identity_column: string;
  list_fields: Array<string>;
  list_per_page: number;
  masterPwd: string;
  ordering: QueryOrderingEnum;
  ordering_field: string;
  readonly_fields: Array<string>;
  search_fields: Array<string>;
  sortable_by: Array<string>;
  sensitive_fields: Array<string>;
  table_name: string;
  table_widgets?: Array<TableWidgetEntity>;
  userId: string;
  table_actions?: Array<TableActionEntity>;
  can_delete: boolean;
  can_update: boolean;
  can_add: boolean;
}
