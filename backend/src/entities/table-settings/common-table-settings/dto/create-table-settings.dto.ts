import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class CreateTableSettingsDto {
  connection_id: string;
  table_name: string;
  display_name: string;
  search_fields: string[];
  excluded_fields: string[];
  identification_fields: string[];
  identity_column;
  readonly_fields: string[];
  sortable_by: string[];
  autocomplete_columns: string[];
  custom_fields?: CustomFieldsEntity[];
  table_widgets?: TableWidgetEntity[];
  columns_view?: string[];
}
