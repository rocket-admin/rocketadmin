import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { ApiProperty } from '@nestjs/swagger';

export class FoundTableStructureDs {
  @ApiProperty({ isArray: true })
  structure: Array<FullTableStructureDs>;

  @ApiProperty({ isArray: true })
  primaryColumns: Array<PrimaryKeyDS>;

  @ApiProperty({ isArray: true })
  foreignKeys: Array<ForeignKeyDS>;

  @ApiProperty({ isArray: true })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true })
  table_widgets: Array<TableWidgetEntity>;
}

export class FullTableStructureDs {
  @ApiProperty()
  column_name: string;

  @ApiProperty()
  column_default: string | number;

  @ApiProperty()
  data_type: string;

  @ApiProperty()
  data_type_params: string;

  @ApiProperty()
  isExcluded: boolean;

  @ApiProperty()
  isSearched: boolean;

  @ApiProperty()
  auto_increment: boolean;

  @ApiProperty()
  allow_null: boolean;

  @ApiProperty()
  character_maximum_length: number;
}
