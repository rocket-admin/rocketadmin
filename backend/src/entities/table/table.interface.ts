import { FilterCriteriaEnum, QueryOrderingEnum } from '../../enums';
import { ITableAccessLevel, ITablePermissionData } from '../permission/permission.interface';
import { ITableWidgetRO } from '../widget/table-widget.interface';

export interface IAllTablesWithPermissions {
  tables: Array<ITablePermissionData>;
}

export interface IAutocompleteFields {
  fields: Array<string>;
  value: string;
}

export interface IFilteringFields {
  field: string;
  criteria: FilterCriteriaEnum;
  value: string;
}

export interface IForeignKeyInfo {
  referenced_column_name: string;
  referenced_table_name: string;
  constraint_name: string;
  column_name: string;
}

export interface IForeignKeyStructure {
  referenced_column_name: string;
  referenced_table_name: string;
  constraint_name: string;
  column_name: string;
  autocomplete_columns: Array<string>;
}

export interface IOrderingField {
  field: string;
  value: QueryOrderingEnum;
}

export interface IPaginationRO {
  total: number;
  lastPage: number;
  perPage: number;
  currentPage: number;
}

export interface IPrimaryColumnName {
  column_name: string;
}

export interface IStructureInfo {
  column_type: string;
  data_type: string;
  column_default: string;
  column_name: string;
  allow_null: boolean;
  extra?: string;
}

export interface IStructureRO {
  structure: Array<IStructureRowInfo>;
  primaryColumns: Array<IPrimaryColumnName>;
  foreignKeys: Array<IForeignKeyStructure>;
  readonly_fields: Array<string>;
  table_widgets: Array<ITableWidgetRO>;
  list_fields?: Array<string>;
}

export interface IStructureRowInfo {
  column_name: string;
  column_default: any;
  data_type: string;
  isExcluded: boolean;
  isSearched: boolean;
  auto_increment: boolean;
  allow_null: boolean;
}

export interface ITablePrimaryColumnInfo {
  data_type: string;
  column_name: string;
}

export interface ITableRowRO {
  row: string | Record<string, unknown>;
  structure: Array<IStructureRowInfo>;
  foreignKeys: Array<IForeignKeyStructure>;
  primaryColumns: Array<IPrimaryColumnName>;
  readonly_fields: Array<string>;
  table_widgets: Array<ITableWidgetRO>;
  list_fields: Array<string>;
}

export interface ITableRowsRO {
  rows: Array<Record<string, unknown>>;
  primaryColumns: Array<IPrimaryColumnName>;
  pagination: IPaginationRO | Record<string, unknown>;
  sortable_by: Array<string>;
  ordering_field: string;
  ordering: QueryOrderingEnum;
  columns_view: Array<string>;
  structure: Array<IStructureRowInfo>;
  foreignKeys: Array<IForeignKeyStructure>;
}

export interface ITablesWithTableAccessLevel {
  table: string;
  permissions: Array<ITableAccessLevel>;
  display_name?: string;
}
