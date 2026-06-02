import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { TableFiltersEntity } from '../table-filters.entity.js';

export function buildCreatedTableFilterRO(tableFilters: TableFiltersEntity): CreatedTableFilterRO {
	const { dynamic_filter_column_name, dynamic_filter_comparator } = tableFilters;
	return {
		id: tableFilters.id,
		table_name: tableFilters.table_name,
		name: tableFilters.name ?? '',
		filters: tableFilters.filters,
		dynamic_column:
			dynamic_filter_column_name !== null && dynamic_filter_comparator !== null
				? {
						column_name: dynamic_filter_column_name,
						comparator: dynamic_filter_comparator,
					}
				: null,
		createdAt: tableFilters.createdAt,
		updatedAt: tableFilters.updatedAt,
	};
}
