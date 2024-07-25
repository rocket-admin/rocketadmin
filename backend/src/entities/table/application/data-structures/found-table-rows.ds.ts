import { FilterCriteriaEnum, QueryOrderingEnum } from '../../../../enums/index.js';
import { FullTableStructureDs } from './found-table-structure.ds.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { RowsPaginationDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/rows-pagination.ds.js';
import { ApiProperty } from '@nestjs/swagger';
import { TablePermissionDs } from '../../../permission/application/data-structures/create-permissions.ds.js';
import { FoundActionEventDTO } from '../../../table-actions/table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';

export class FoundTableRowsDs {
  @ApiProperty({ isArray: true })
  rows: Array<Record<string, unknown>>;

  @ApiProperty({ isArray: true, type: PrimaryKeyDS })
  primaryColumns: Array<PrimaryKeyDS>;

  @ApiProperty()
  pagination: RowsPaginationDS;

  @ApiProperty({ isArray: true })
  sortable_by: Array<string>;

  @ApiProperty()
  ordering_field: string;

  @ApiProperty({ enum: QueryOrderingEnum })
  ordering: QueryOrderingEnum;

  @ApiProperty({ isArray: true })
  columns_view: Array<string>;

  @ApiProperty({ isArray: true, type: FullTableStructureDs })
  structure: Array<FullTableStructureDs>;

  @ApiProperty({ isArray: true, type: ForeignKeyDS })
  foreignKeys: Array<ForeignKeyDS>;

  @ApiProperty()
  configured: boolean;

  @ApiProperty({ isArray: true })
  widgets: Array<TableWidgetEntity>;

  @ApiProperty()
  identity_column: string;

  @ApiProperty()
  table_permissions: TablePermissionDs;

  @ApiProperty({ isArray: true, type: FoundActionEventDTO })
  action_events: Array<FoundActionEventDTO>;

  @ApiProperty()
  large_dataset: boolean;

  @ApiProperty()
  allow_csv_export: boolean;

  @ApiProperty()
  allow_csv_import: boolean;
}

export class TableStructureDs {
  @ApiProperty()
  allow_null: boolean;

  @ApiProperty()
  auto_increment: boolean;

  @ApiProperty()
  column_default: any;

  @ApiProperty()
  column_name: string;

  @ApiProperty()
  data_type: string;

  @ApiProperty()
  isExcluded: boolean;

  @ApiProperty()
  isSearched: boolean;
}

export class ForeignKeysDs {
  @ApiProperty()
  autocomplete_columns: Array<string>;

  @ApiProperty()
  column_name: string;

  @ApiProperty()
  constraint_name: string;

  @ApiProperty()
  referenced_column_name: string;

  @ApiProperty()
  referenced_table_name: string;
}

export class PrimaryColumnNameDs {
  @ApiProperty()
  column_name: string;
}

export class OrderingFiledDs {
  @ApiProperty()
  field: string;

  @ApiProperty({ enum: QueryOrderingEnum })
  value: QueryOrderingEnum;
}

export class FilteringFieldsDs {
  @ApiProperty({ enum: FilterCriteriaEnum })
  criteria: FilterCriteriaEnum;

  @ApiProperty()
  field: string;

  @ApiProperty()
  value: string;
}

export class AutocompleteFieldsDs {
  @ApiProperty({ isArray: true })
  fields: Array<string>;

  @ApiProperty()
  value: string;
}
