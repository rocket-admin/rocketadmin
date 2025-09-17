import { ApiProperty } from '@nestjs/swagger';
import { FilterCriteriaEnum } from '../../enums/index.js';
import { TableAccessLevelsDs } from '../permission/application/data-structures/create-permissions.ds.js';
import { FoundActionEventDTO } from '../table-actions/table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { TableWidgetRO } from '../widget/table-widget.interface.js';
import { TableSettingsInRowsDS } from './application/data-structures/found-table-rows.ds.js';

export class FilteringFieldsDs {
  @ApiProperty()
  field: string;

  @ApiProperty({ enum: FilterCriteriaEnum })
  criteria: FilterCriteriaEnum;

  @ApiProperty()
  value: string;
}

export class ForeignKeyDSInfo {
  @ApiProperty()
  referenced_column_name: string;

  @ApiProperty()
  referenced_table_name: string;

  @ApiProperty()
  constraint_name: string;

  @ApiProperty()
  column_name: string;
}

export class ForeignKeyDSStructure {
  @ApiProperty()
  referenced_column_name: string;

  @ApiProperty()
  referenced_table_name: string;

  @ApiProperty()
  constraint_name: string;

  @ApiProperty()
  column_name: string;

  @ApiProperty({ isArray: true })
  autocomplete_columns: Array<string>;
}

export class PaginationRO {
  @ApiProperty()
  total: number;

  @ApiProperty()
  lastPage: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  currentPage: number;
}

export class PrimaryColumnNameDs {
  @ApiProperty()
  column_name: string;
}

export class StructureRowInfoDs {
  @ApiProperty()
  column_name: string;

  @ApiProperty()
  column_default: any;

  @ApiProperty()
  data_type: string;

  @ApiProperty()
  isExcluded: boolean;

  @ApiProperty()
  isSearched: boolean;

  @ApiProperty()
  auto_increment: boolean;

  @ApiProperty()
  allow_null: boolean;
}

export class TableStructureDs {
  @ApiProperty({ isArray: true, type: StructureRowInfoDs })
  structure: Array<StructureRowInfoDs>;

  @ApiProperty({ isArray: true, type: PrimaryColumnNameDs })
  primaryColumns: Array<PrimaryColumnNameDs>;

  @ApiProperty({ isArray: true, type: ForeignKeyDSStructure })
  foreignKeys: Array<ForeignKeyDSStructure>;

  @ApiProperty({ isArray: true })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true, type: TableWidgetRO })
  table_widgets: Array<TableWidgetRO>;

  @ApiProperty({ isArray: true })
  list_fields?: Array<string>;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true })
  excluded_fields: Array<string>;
}

export class ReferencedByTableInfoDs {
  @ApiProperty()
  table_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  column_name: string;
}

export class ReferencedTableNamesAndColumnsDs {
  @ApiProperty({ isArray: true, type: ReferencedByTableInfoDs })
  referenced_by: Array<ReferencedByTableInfoDs>;

  @ApiProperty()
  referenced_on_column_name: string;
}

export class TableRowRODs {
  @ApiProperty()
  row: string | Record<string, unknown>;

  @ApiProperty({ isArray: true, type: StructureRowInfoDs })
  structure: Array<StructureRowInfoDs>;

  @ApiProperty({ isArray: true, type: ForeignKeyDSStructure })
  foreignKeys: Array<ForeignKeyDSStructure>;

  @ApiProperty({ isArray: true, type: PrimaryColumnNameDs })
  primaryColumns: Array<PrimaryColumnNameDs>;

  @ApiProperty({ isArray: true })
  readonly_fields: Array<string>;

  @ApiProperty({ isArray: true, type: TableWidgetRO })
  table_widgets: Array<TableWidgetRO>;

  @ApiProperty({ isArray: true })
  list_fields: Array<string>;

  @ApiProperty({ isArray: true })
  excluded_fields: Array<string>;

  @ApiProperty({ isArray: true, type: FoundActionEventDTO })
  action_events?: Array<FoundActionEventDTO>;

  @ApiProperty({ isArray: true, type: FoundActionEventDTO })
  table_actions?: Array<FoundActionEventDTO>;

  @ApiProperty()
  identity_column: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  table_access_level?: TableAccessLevelsDs;

  @ApiProperty({ isArray: true, type: ReferencedTableNamesAndColumnsDs })
  referenced_table_names_and_columns: Array<ReferencedTableNamesAndColumnsDs>;

  @ApiProperty()
  can_delete: boolean;

  @ApiProperty()
  can_update: boolean;

  @ApiProperty()
  can_add: boolean;

  @ApiProperty({ type: TableSettingsInRowsDS })
  table_settings: TableSettingsInRowsDS;
}
