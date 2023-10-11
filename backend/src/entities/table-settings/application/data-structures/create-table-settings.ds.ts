import { ApiProperty } from '@nestjs/swagger';
import { QueryOrderingEnum } from '../../../../enums/index.js';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class CreateTableSettingsDs {
  @ApiProperty({ isArray: true })
  autocomplete_columns: Array<string>;

  @ApiProperty({ isArray: true })
  columns_view?: Array<string>;

  connection_id: string;

  @ApiProperty({ isArray: true, required: false })
  custom_fields?: Array<CustomFieldsEntity>;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true })
  excluded_fields: Array<string>;

  @ApiProperty({ isArray: true })
  identification_fields: Array<string>;

  @ApiProperty()
  identity_column: string;

  @ApiProperty({ isArray: true })
  list_fields: Array<string>;

  @ApiProperty()
  list_per_page: number;

  masterPwd: string;

  @ApiProperty({ enum: QueryOrderingEnum })
  ordering: QueryOrderingEnum;

  @ApiProperty()
  ordering_field: string;

  @ApiProperty({ isArray: true })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true })
  search_fields: Array<string>;

  @ApiProperty({ isArray: true })
  sortable_by: Array<string>;

  @ApiProperty({ isArray: true })
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
}
