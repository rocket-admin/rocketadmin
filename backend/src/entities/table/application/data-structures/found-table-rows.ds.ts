import { FilterCriteriaEnum, QueryOrderingEnum } from '../../../../enums';
import {
  IForeignKey,
  IPagination,
  IPrimaryKey,
} from '../../../../data-access-layer/shared/data-access-object-interface';
import { FullTableStructureDs } from './found-table-structure.ds';
import { ITablePermissionData } from '../../../permission/permission.interface';
import { TableWidgetEntity } from '../../../widget/table-widget.entity';
import { TableActionEntity } from '../../../table-actions/table-action.entity';

export class FoundTableRowsDs {
  rows: Array<Record<string, unknown>>;
  primaryColumns: Array<IPrimaryKey>;
  pagination: IPagination;
  sortable_by: Array<string>;
  ordering_field: string;
  ordering: QueryOrderingEnum;
  columns_view: Array<string>;
  structure: Array<FullTableStructureDs>;
  foreignKeys: Array<IForeignKey>;
  configured: boolean;
  widgets: Array<TableWidgetEntity>;
  identity_column: string;
  table_permissions: ITablePermissionData;
  table_actions: Array<TableActionEntity>;
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
