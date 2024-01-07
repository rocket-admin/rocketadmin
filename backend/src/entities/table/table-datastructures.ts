import { FilterCriteriaEnum, QueryOrderingEnum } from '../../enums/index.js';
import {
  TableAccessLevelsDs,
  TablePermissionDs,
} from '../permission/application/data-structures/create-permissions.ds.js';
import { ITableAccessLevel } from '../permission/permission.interface.js';
import { CreatedTableActionDS } from '../table-actions/application/data-sctructures/created-table-action.ds.js';
import { TableWidgetRO } from '../widget/table-widget.interface.js';
import { ApiProperty } from '@nestjs/swagger';

export class AllTablesWithPermissionsDs {
  @ApiProperty({ isArray: true })
  tables: Array<TablePermissionDs>;
}

export class AutocompleteFieldsDs {
  @ApiProperty({ isArray: true })
  fields: Array<string>;

  @ApiProperty()
  value: string;
}

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

export class IOrderingField {
  @ApiProperty()
  field: string;

  @ApiProperty({ enum: QueryOrderingEnum })
  value: QueryOrderingEnum;
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

export class StructureInfoDs {
  @ApiProperty()
  column_type: string;

  @ApiProperty()
  data_type: string;

  @ApiProperty()
  column_default: string;

  @ApiProperty()
  column_name: string;

  @ApiProperty()
  allow_null: boolean;

  @ApiProperty()
  extra?: string;
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
}

export class TablePrimaryColumnInfoDs {
  @ApiProperty()
  data_type: string;

  @ApiProperty()
  column_name: string;
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

  @ApiProperty({ isArray: true, type: CreatedTableActionDS })
  table_actions?: Array<CreatedTableActionDS>;

  @ApiProperty()
  identity_column: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty()
  table_access_level?: TableAccessLevelsDs;

  @ApiProperty({ isArray: true, type: ReferencedTableNamesAndColumnsDs })
  referenced_table_names_and_columns: Array<ReferencedTableNamesAndColumnsDs>;
}

export class TableRowsRO {
  rows: Array<Record<string, unknown>>;
  primaryColumns: Array<PrimaryColumnNameDs>;
  pagination: PaginationRO | Record<string, unknown>;
  sortable_by: Array<string>;
  ordering_field: string;
  ordering: QueryOrderingEnum;
  columns_view: Array<string>;
  structure: Array<StructureRowInfoDs>;
  foreignKeys: Array<ForeignKeyDSStructure>;
}

export class TablesWithTableAccessLevelDs {
  table: string;
  permissions: Array<ITableAccessLevel>;
  display_name?: string;
}
