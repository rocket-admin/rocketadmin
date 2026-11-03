// The saved-filters panel's pure parts: splitting a saved filter into its static conditions and its
// quick-editing ("dynamic") column, the chip text of a condition, and the table URL query.
import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import { normalizeTableName } from '@/lib/normalize';
import type { SavedFilter } from '@/stores/tables';
import type { SavedFilterDynamicColumn } from './SavedFiltersDialog.helpers';
import type { FiltersByField } from './TableFiltersDialog.helpers';

/** One `{ column: { operator: value } }` condition. */
export interface FilterEntry {
	column: string;
	operator: string;
	value: unknown;
}

/** A saved filter as GET /table-filters/:id/all returns it. */
export interface SavedFilterRecord extends SavedFilter {
	filters: FiltersByField;
	dynamic_column?: SavedFilterDynamicColumn | null;
	createdAt?: string;
}

/**
 * `processFiltersData()`: the saved filter plus its conditions, split into the static ones (chips)
 * and the dynamic column (the inline editor). This is what `filterSelected` emits.
 */
export interface ProcessedSavedFilter extends SavedFilterRecord {
	filterEntries: FilterEntry[];
	staticFilters: FilterEntry[];
	dynamicColumn: FilterEntry | null;
}

export const DISPLAYED_COMPARATORS: Readonly<Record<string, string>> = {
	eq: '=',
	gt: '>',
	lt: '<',
	gte: '>=',
	lte: '<=',
	startswith: 'starts with',
	endswith: 'ends with',
	contains: 'contains',
	icontains: 'not contains',
	empty: 'is empty',
};

/** The comparator words next to the dynamic column's name (small screens), per comparator family. */
export const TEXT_COMPARATOR_TEXT: Readonly<Record<string, string>> = {
	startswith: 'starts with',
	endswith: 'ends with',
	eq: 'equal',
	contains: 'contains',
	icontains: 'not contains',
	empty: 'is empty',
};

export const NUMBER_COMPARATOR_TEXT: Readonly<Record<string, string>> = {
	eq: '=',
	gt: '>',
	lt: '<',
	gte: '≥',
	lte: '≤',
};

export function getFilterEntries(filters: FiltersByField | null | undefined): FilterEntry[] {
	if (!filters) return [];
	const entries: FilterEntry[] = [];
	for (const column of Object.keys(filters)) {
		const operations = filters[column] ?? {};
		for (const operator of Object.keys(operations)) {
			entries.push({ column, operator, value: operations[operator] });
		}
	}
	return entries;
}

export function processFiltersData(filter: SavedFilterRecord): ProcessedSavedFilter {
	const dynamic = filter.dynamic_column;
	let dynamicColumn: FilterEntry | null = null;
	if (dynamic?.column_name) {
		dynamicColumn = { column: dynamic.column_name, operator: dynamic.comparator, value: null };
		const dynamicColFilters = filter.filters?.[dynamic.column_name];
		if (dynamicColFilters) dynamicColumn.value = dynamicColFilters[dynamic.comparator];
	}
	return {
		...filter,
		filterEntries: getFilterEntries(filter.filters),
		staticFilters: getFilterEntries(filter.filters).filter((entry) => !dynamic || entry.column !== dynamic.column_name),
		dynamicColumn,
	};
}

/** Oldest first, as the panel lists them. */
export function sortByCreation<T extends { createdAt?: string }>(filters: T[]): T[] {
	return [...filters].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
}

/** `getFilter()`: the static condition chip, e.g. `First name = ...Jo...`. */
export function describeFilter(entry: FilterEntry): string {
	const displayedName = normalizeTableName(entry.column);
	const value = entry.value;
	switch (entry.operator) {
		case 'startswith':
			return `${displayedName} = ${value}...`;
		case 'endswith':
			return `${displayedName} = ...${value}`;
		case 'contains':
			return `${displayedName} = ...${value}...`;
		case 'icontains':
			return `${displayedName} != ...${value}...`;
		case 'empty':
			return `${displayedName} = ' '`;
		default:
			return `${displayedName} ${DISPLAYED_COMPARATORS[entry.operator]} ${value}`;
	}
}

/** `buildQueryParams()`: first page, the current page size and sort, plus `additional`. */
export function buildQueryParams(current: LocationQuery, additional: LocationQueryRaw = {}): LocationQueryRaw {
	const query: LocationQueryRaw = {
		page_index: 0,
		page_size: firstValue(current.page_size) || 30,
		...additional,
	};
	const sortActive = firstValue(current.sort_active);
	const sortDirection = firstValue(current.sort_direction);
	if (sortActive) query.sort_active = sortActive;
	if (sortDirection) query.sort_direction = sortDirection;
	return query;
}

/**
 * `applyDynamicColumnChanges()`: the saved filter's conditions with the dynamic column set to the
 * typed value, or dropped while the value is empty.
 */
export function applyDynamicColumn(filter: ProcessedSavedFilter): {
	filters: FiltersByField;
	dynamicColumn: SavedFilterDynamicColumn;
} | null {
	const dynamic = filter.dynamicColumn;
	if (!dynamic) return null;
	const dynamicColumn = { column_name: dynamic.column, comparator: dynamic.operator };
	const filterValue = dynamic.value === '' || dynamic.value === undefined ? null : dynamic.value;
	const filters: FiltersByField = { ...filter.filters };
	if (dynamic.column && dynamic.operator && filterValue !== null) {
		filters[dynamic.column] = { [dynamic.operator]: filterValue };
	} else if (filters[dynamic.column]) {
		delete filters[dynamic.column];
	}
	return { filters, dynamicColumn };
}

function firstValue(value: LocationQuery[string] | undefined): string | undefined {
	const first = Array.isArray(value) ? value[0] : value;
	return first ?? undefined;
}
