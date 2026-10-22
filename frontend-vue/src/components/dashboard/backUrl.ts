// "Back to the table" state for the row edit page: the table view's paging/sort from the URL and
// its active filters, stashed in sessionStorage (TableStateService.setBackUrlParams/Filters) right
// before a link to the entry page is followed.
import type { LocationQuery } from 'vue-router';
import { DEFAULT_PAGE_SIZE, queryValue } from '@/lib/table-query';
import { useTableStateStore } from '@/stores/table-state';

export function stashBackUrl(query: LocationQuery, activeFilters: object | null | undefined): void {
	const tableState = useTableStateStore();
	tableState.setBackUrlParams(
		Number.parseInt(queryValue(query, 'page_index') ?? '', 10) || 0,
		Number.parseInt(queryValue(query, 'page_size') ?? '', 10) || DEFAULT_PAGE_SIZE,
		queryValue(query, 'sort_active'),
		queryValue(query, 'sort_direction'),
	);
	stashBackUrlFilters(activeFilters);
}

/** Only the filters (stashFilters): kept when there are any, cleared otherwise. */
export function stashBackUrlFilters(activeFilters: object | null | undefined): void {
	const tableState = useTableStateStore();
	if (activeFilters && Object.keys(activeFilters).length > 0) {
		tableState.setBackUrlFilters(activeFilters as Record<string, unknown>);
	} else {
		tableState.setBackUrlFilters(null);
	}
}
