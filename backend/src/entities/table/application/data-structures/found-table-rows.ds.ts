import { FilterCriteriaEnum, QueryOrderingEnum } from '../../../../enums/index.js';
import { FullTableStructureDs } from './found-table-structure.ds.js';
import { ITablePermissionData } from '../../../permission/permission.interface.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';
import { CreatedTableActionDS } from '../../../table-actions/application/data-sctructures/created-table-action.ds.js';
import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { RowsPaginationDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/rows-pagination.ds.js';

export class FoundTableRowsDs {
  rows: Array<Record<string, unknown>>;
  primaryColumns: Array<PrimaryKeyDS>;
  pagination: RowsPaginationDS;
  sortable_by: Array<string>;
  ordering_field: string;
  ordering: QueryOrderingEnum;
  columns_view: Array<string>;
  structure: Array<FullTableStructureDs>;
  foreignKeys: Array<ForeignKeyDS>;
  configured: boolean;
  widgets: Array<TableWidgetEntity>;
  identity_column: string;
  table_permissions: ITablePermissionData;
  table_actions: Array<CreatedTableActionDS>;
  large_dataset: boolean;
}

export class TableStructureDs {
  allow_null: boolean;
  auto_increment: boolean;
  column_default: any;
  column_name: string;
  data_type: string;
  isExcluded: boolean;
  isSearched: boolean;
}

export class ForeignKeysDs {
  autocomplete_columns: Array<string>;
  column_name: string;
  constraint_name: string;
  referenced_column_name: string;
  referenced_table_name: string;
}

export class PrimaryColumnNameDs {
  column_name: string;
}

export class OrderingFiledDs {
  field: string;
  value: QueryOrderingEnum;
}

export class FilteringFieldsDs {
  criteria: FilterCriteriaEnum;
  field: string;
  value: string;
}

export class AutocompleteFieldsDs {
  fields: Array<string>;
  value: string;
}
