import { DynamicTableFiltersDs } from '../application/data-structures/create-table-filters.ds.js';
import { TableFiltersEntity } from '../table-filters.entity.js';
import { UpdateTableFilterValidationDs } from './validate-table-filters-data.util.js';

type CreateTableFilterData = {
  table_name: string;
  filter_name: string;
  connection_id: string;
  filters: Record<string, any>;
  dynamic_filtered_column: DynamicTableFiltersDs | null;
};
export function buildNewTableFiltersEntity(
  filterData: CreateTableFilterData | UpdateTableFilterValidationDs,
): TableFiltersEntity {
  const newTableFilters = new TableFiltersEntity();
  newTableFilters.table_name = filterData.table_name;
  newTableFilters.connectionId = filterData.connection_id;
  newTableFilters.filters = filterData.filters;
  newTableFilters.name = filterData.filter_name;

  if (filterData.dynamic_filtered_column) {
    newTableFilters.dynamic_filter_column_name = filterData.dynamic_filtered_column.column_name;
    newTableFilters.dynamic_filter_comparator = filterData.dynamic_filtered_column.comparator;
  } else {
    newTableFilters.dynamic_filter_column_name = null;
  }

  return newTableFilters;
}
