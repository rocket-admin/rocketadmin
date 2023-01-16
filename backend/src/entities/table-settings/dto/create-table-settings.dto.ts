import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import { QueryOrderingEnum } from '../../../enums/index.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';

export class CreateTableSettingsDto {
  @ApiProperty()
  connection_id: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  search_fields: string[];

  @ApiProperty()
  excluded_fields: string[];

  @ApiProperty()
  list_fields: string[];

  @ApiProperty()
  identification_fields: string[];

  @ApiProperty()
  list_per_page: number;

  @ApiProperty()
  ordering: QueryOrderingEnum;

  @ApiProperty()
  ordering_field: string;

  @ApiProperty()
  identity_column;

  @ApiProperty()
  readonly_fields: string[];

  @ApiProperty()
  sortable_by: string[];

  @ApiProperty()
  autocomplete_columns: string[];

  @ApiProperty()
  custom_fields?: CustomFieldsEntity[];

  @ApiProperty()
  table_widgets?: TableWidgetEntity[];

  @ApiProperty()
  columns_view?: string[];
}
