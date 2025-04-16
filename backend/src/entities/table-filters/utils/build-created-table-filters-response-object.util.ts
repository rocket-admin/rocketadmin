import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { TableFiltersEntity } from '../table-filters.entity.js';

export function buildCreatedTableFilterRO(tableFilters: TableFiltersEntity): CreatedTableFilterRO {
  const dynamicColumnExists: boolean =
    tableFilters.dynamic_filter_column_name !== null && tableFilters.dynamic_filter_comparator !== null;
  return {
    id: tableFilters.id,
    table_name: tableFilters.table_name,
    name: tableFilters.name,
    filters: tableFilters.filters,
    dynamic_column: dynamicColumnExists
      ? {
          column_name: tableFilters.dynamic_filter_column_name,
          comparator: tableFilters.dynamic_filter_comparator,
        }
      : null,
    createdAt: tableFilters.createdAt,
    updatedAt: tableFilters.updatedAt,
  };
}
