// The saved-filters dialog's pure parts: reading a saved filter into per-column values and
// comparators, and the create/update payload of handleSaveFilters().
import type { FiltersByField } from './TableFiltersDialog.helpers';

/** `{ column_name, comparator }`: the one column a fast filter lets the user edit from the table view. */
export interface SavedFilterDynamicColumn {
	column_name: string;
	comparator: string;
}

/** A saved ("fast") filter as the dialog edits it; `id` is absent for a new one. */
export interface SavedFilterSet {
	id?: string;
	name: string;
	filters: FiltersByField;
	dynamic_column?: SavedFilterDynamicColumn | null;
	[key: string]: unknown;
}

export interface SavedFilterPayload {
	name: string;
	filters: FiltersByField;
	dynamic_column?: SavedFilterDynamicColumn;
}

export interface SavedFilterFormState {
	/** Column → value. */
	values: Record<string, unknown>;
	/** Column → comparator. */
	comparators: Record<string, string | undefined>;
	/** The quick-editing column, or null. */
	dynamicColumn: string | null;
}

/** ngOnInit: one value and comparator per saved column; the dynamic column starts empty. */
export function readFiltersSet(filtersSet: SavedFilterSet | null | undefined): SavedFilterFormState {
	const values: Record<string, unknown> = {};
	const comparators: Record<string, string | undefined> = {};
	let dynamicColumn: string | null = null;
	if (!filtersSet) return { values, comparators, dynamicColumn };

	for (const [field, conditions] of Object.entries(filtersSet.filters ?? {})) {
		const [comparator, value] = Object.entries(conditions ?? {})[0] ?? [];
		values[field] = value;
		comparators[field] = comparator;
	}

	const dynamic = filtersSet.dynamic_column;
	if (dynamic?.column_name) {
		values[dynamic.column_name] = null;
		comparators[dynamic.column_name] = dynamic.comparator || '';
		dynamicColumn = dynamic.column_name;
	}
	return { values, comparators, dynamicColumn };
}

/** handleSaveFilters()'s condition check: a column other than the dynamic one, or the dynamic one, has a comparator. */
export function hasConditions({ values, comparators, dynamicColumn }: SavedFilterFormState): boolean {
	const hasRegularFilters = Object.keys(values).some(
		(key) => key !== dynamicColumn && comparators[key] !== undefined && comparators[key] !== null,
	);
	const hasDynamicColumnFilter =
		!!dynamicColumn && comparators[dynamicColumn] !== undefined && comparators[dynamicColumn] !== null;
	return hasRegularFilters || hasDynamicColumnFilter;
}

/**
 * The body for POST/PUT /table-filters: every column but the dynamic one as `{ comparator: value }`
 * (`''`/`undefined` saved as `null`), and the dynamic column with its comparator (`''` when none).
 * `null` when there are no columns at all, in which case Angular sent nothing.
 */
export function buildSavedFilterPayload(name: string, state: SavedFilterFormState): SavedFilterPayload | null {
	const { values, comparators, dynamicColumn } = state;
	if (!Object.keys(values).length) return null;

	const filters: FiltersByField = {};
	for (const key in values) {
		if (key === dynamicColumn) continue;
		const comparator = comparators[key];
		if (comparator !== undefined) {
			const value = values[key] === '' || values[key] === undefined ? null : values[key];
			filters[key] = { [comparator]: value };
		}
	}

	const payload: SavedFilterPayload = { name, filters };
	if (dynamicColumn) {
		payload.dynamic_column = { column_name: dynamicColumn, comparator: comparators[dynamicColumn] || '' };
	}
	return payload;
}

/** The comparator selects of a condition card, with the Angular option texts. */
export const TEXT_COMPARATOR_OPTIONS = [
	{ value: 'startswith', label: 'starts with' },
	{ value: 'endswith', label: 'ends with' },
	{ value: 'eq', label: 'equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'icontains', label: 'not contains' },
	{ value: 'empty', label: 'is empty' },
];

export const NUMBER_COMPARATOR_OPTIONS = [
	{ value: 'eq', label: 'equal' },
	{ value: 'gt', label: 'greater than' },
	{ value: 'lt', label: 'less than' },
	{ value: 'gte', label: 'greater than or equal' },
	{ value: 'lte', label: 'less than or equal' },
];
