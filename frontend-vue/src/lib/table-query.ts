// The table view's state in the URL, as the Angular dashboard read and wrote it (it replaced
// ngmat-table-query-reflector, which db-table-view declared but never actually imported).
//
// Query params of /dashboard/:connectionId/:tableName:
//   filters        JsonURL of `{ [column]: { [comparator]: value } }`
//   saved_filter   id of the selected saved ("fast") filter
//   dynamic_column JsonURL of the saved filter's `{ column_name, comparator }`
//   sort_active    sorted column
//   sort_direction ASC | DESC (written uppercase; read case-insensitively)
//   page_index     0-based page
//   page_size      rows per page (default 30)
//   search         search string
//   uncached       'true' bypasses the server's rows cache (set by auto-configure)
import JsonURL from '@jsonurl/jsonurl';
import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import { getComparatorsFromUrl } from '@/lib/parse-filter-params';

/** `{ [column]: { [comparator]: value } }` */
export type TableFilters = Record<string, Record<string, unknown>>;

export const DEFAULT_PAGE_SIZE = 30;

export interface TableQueryState {
	filters: TableFilters | undefined;
	comparators: Record<string, string | undefined>;
	pageIndex: number;
	pageSize: number;
	sortActive: string | undefined;
	sortDirection: string | undefined;
	search: string | undefined;
	uncached: boolean;
	savedFilter: string | undefined;
	dynamicColumn: string | undefined;
}

/** The first value of a query param, or undefined. */
export function queryValue(query: LocationQuery | LocationQueryRaw, key: string): string | undefined {
	const raw = query[key];
	const value = Array.isArray(raw) ? raw[0] : raw;
	return value === null || value === undefined ? undefined : String(value);
}

/** JsonURL.parse that returns undefined for a missing or malformed value instead of throwing. */
export function parseJsonUrl<T>(value: string | undefined): T | undefined {
	if (!value) return undefined;
	try {
		return JsonURL.parse(value) as T;
	} catch {
		return undefined;
	}
}

/** JsonURL.stringify; `undefined` for no filters, so the param is dropped. */
export function stringifyJsonUrl(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	return JsonURL.stringify(value) ?? undefined;
}

/** What DashboardComponent.setTable read from `route.snapshot.queryParams`. */
export function parseTableQuery(query: LocationQuery): TableQueryState {
	const filters = parseJsonUrl<TableFilters>(queryValue(query, 'filters'));
	return {
		filters,
		comparators: getComparatorsFromUrl(filters ?? {}),
		pageIndex: Number.parseInt(queryValue(query, 'page_index') ?? '', 10) || 0,
		pageSize: Number.parseInt(queryValue(query, 'page_size') ?? '', 10) || DEFAULT_PAGE_SIZE,
		sortActive: queryValue(query, 'sort_active'),
		sortDirection: queryValue(query, 'sort_direction'),
		search: queryValue(query, 'search'),
		uncached: queryValue(query, 'uncached') === 'true',
		savedFilter: queryValue(query, 'saved_filter'),
		dynamicColumn: queryValue(query, 'dynamic_column'),
	};
}

/** 'ASC' | 'DESC' for the API from any-case URL/sort values; undefined when unsorted. */
export function toSortOrder(direction: string | undefined | null): 'ASC' | 'DESC' | undefined {
	const upper = direction?.toUpperCase();
	return upper === 'ASC' || upper === 'DESC' ? upper : undefined;
}

/** Drops undefined values, as Angular's router did for `queryParams` (an empty string stays). */
function compact(query: Record<string, string | number | undefined>): LocationQueryRaw {
	const result: LocationQueryRaw = {};
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined) result[key] = String(value);
	}
	return result;
}

/** Sort or page changed in the table view (DbTableViewComponent.ngAfterViewInit). */
export function sortPageQuery(params: {
	filters: TableFilters | undefined;
	savedFilter: string | undefined;
	dynamicColumn: string | undefined;
	sortActive: string;
	sortDirection: string;
	pageIndex: number;
	pageSize: number;
}): LocationQueryRaw {
	return compact({
		filters: stringifyJsonUrl(params.filters),
		saved_filter: params.savedFilter,
		dynamic_column: params.dynamicColumn,
		sort_active: params.sortActive,
		sort_direction: params.sortDirection.toUpperCase(),
		page_index: params.pageIndex,
		page_size: params.pageSize,
	});
}

/** Filters applied from the dialog or a chip removed: filters, first page, same page size. */
export function filtersQuery(filters: TableFilters, pageSize: number): LocationQueryRaw {
	return compact({ filters: stringifyJsonUrl(filters), page_index: 0, page_size: pageSize });
}

/** All filters cleared. */
export function clearedFiltersQuery(pageSize: number): LocationQueryRaw {
	return compact({ page_index: 0, page_size: pageSize });
}

/** A search submitted (or cleared, with an empty value). */
export function searchQuery(search: string | null | undefined, pageSize: number): LocationQueryRaw {
	return compact({ page_index: 0, page_size: pageSize, search: search ?? undefined });
}

/** Opening another table from the sidebar or the table switcher. */
export const FIRST_PAGE_QUERY: Readonly<LocationQueryRaw> = Object.freeze({ page_index: '0', page_size: '30' });

/**
 * The dialog's raw `tableRowFieldsShown` + `tableRowFieldsComparator` as URL filters
 * (DashboardComponent.openTableFilters): undefined values dropped, columns without a comparator
 * skipped. Null when nothing is left, in which case Angular did nothing.
 */
export function buildFilters(
	fields: Record<string, unknown>,
	comparators: Record<string, string | undefined>,
): TableFilters | null {
	const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
	if (!keys.length) return null;
	const filters: TableFilters = {};
	for (const key of keys) {
		const comparator = comparators[key];
		if (comparator !== undefined) filters[key] = { [comparator]: fields[key] };
	}
	return filters;
}
