import { ApiProperty } from '@nestjs/swagger';
import { QueryOrderingEnum } from '../../../../enums/index.js';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class FoundTableSettingsDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true, type: String })
  search_fields: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  excluded_fields: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  list_fields: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  identification_fields: Array<string>;

  @ApiProperty()
  list_per_page: number;

  @ApiProperty({ enum: QueryOrderingEnum })
  ordering: QueryOrderingEnum;

  @ApiProperty()
  ordering_field: string;

  @ApiProperty()
  identity_column: string;

  @ApiProperty({ isArray: true, type: String })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  sensitive_fields: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  sortable_by: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  autocomplete_columns: Array<string>;

  @ApiProperty({ isArray: true, type: String })
  columns_view: Array<string>;

  @ApiProperty()
  connection_id: string;

  @ApiProperty({ isArray: true, type: CustomFieldsEntity })
  custom_fields: Array<CustomFieldsEntity>;

  @ApiProperty({ isArray: true, type: TableWidgetEntity })
  table_widgets: Array<TableWidgetEntity>;

  @ApiProperty({ isArray: true, type: TableActionEntity })
  table_actions: Array<TableActionEntity>;

  @ApiProperty()
  can_add: boolean;

  @ApiProperty()
  can_delete: boolean;

  @ApiProperty()
  can_update: boolean;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  allow_csv_export: boolean;

  @ApiProperty()
  allow_csv_import: boolean;
}
