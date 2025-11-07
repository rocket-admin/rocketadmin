import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-actions-module/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class CreateTableSettingsDs {
  @ApiProperty({ isArray: true, type: 'string' })
  autocomplete_columns: Array<string>;

  @ApiProperty({ isArray: true, type: 'string', required: false })
  columns_view?: Array<string>;

  connection_id: string;

  @ApiProperty({ isArray: true, required: false })
  custom_fields?: Array<CustomFieldsEntity>;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true, type: 'string' })
  excluded_fields: Array<string>;

  @ApiProperty({ isArray: true, type: 'string' })
  identification_fields: Array<string>;

  @ApiProperty()
  identity_column: string;

  masterPwd: string;

  @ApiProperty({ isArray: true, type: 'string' })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true, type: 'string' })
  search_fields: Array<string>;

  @ApiProperty({ isArray: true, type: 'string' })
  sortable_by: Array<string>;

  @ApiProperty({ isArray: true, type: 'string' })
  sensitive_fields: Array<string>;

  table_name: string;

  @ApiProperty({ isArray: true })
  table_widgets?: Array<TableWidgetEntity>;

  userId: string;

  @ApiProperty({ isArray: true })
  table_actions?: Array<TableActionEntity>;

  @ApiProperty()
  can_delete: boolean;

  @ApiProperty()
  can_update: boolean;

  @ApiProperty()
  can_add: boolean;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  allow_csv_export: boolean;

  @ApiProperty()
  allow_csv_import: boolean;
}
