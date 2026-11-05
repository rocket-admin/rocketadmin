/**
 * The Angular filter components carried a `static type` (`'text'`, `'number'`, `'datetime'`, …) that
 * the filters dialog and `DefaultFilterComponent` read off the class to pick a comparator list.
 * A Vue SFC has no static members, and the maps in `@/consts/filter-types` hand out lazy
 * `defineAsyncComponent` wrappers whose target is not loaded yet, so the type lives here instead,
 * keyed both by those wrappers (what a host resolves from the maps) and by SFC name (a widget
 * imported directly, as in tests and stories).
 */
import { type Component, toRaw } from 'vue';
import type { SelectOption } from '@/components/ui';
import { UIwidgets } from '@/consts/filter-types';

/** The comparator family of a filter widget, `undefined` for a widget that manages its own. */
export type FilterComparatorType = 'text' | 'number' | 'datetime' | 'file' | 'timezone';

/** `static type` of each Angular filter component, by Vue SFC name. */
export const FILTER_COMPARATOR_TYPES: Readonly<Record<string, FilterComparatorType>> = {
	TextFilter: 'text',
	LongTextFilter: 'text',
	NumberFilter: 'number',
	TimeIntervalFilter: 'number',
	DateFilter: 'datetime',
	TimeFilter: 'datetime',
	FileFilter: 'file',
	TimezoneFilter: 'timezone',
};

// Every key of every DB map in filter-types reuses one of these wrapper instances.
const BY_WRAPPER = new Map<unknown, FilterComparatorType>([
	[UIwidgets.String, 'text'],
	[UIwidgets.Textarea, 'text'],
	[UIwidgets.Number, 'number'],
	[UIwidgets.TimeInterval, 'number'],
	[UIwidgets.Date, 'datetime'],
	[UIwidgets.Time, 'datetime'],
	[UIwidgets.File, 'file'],
	[UIwidgets.Timezone, 'timezone'],
]);

/** The Angular `ComponentClass.type` lookup, for a widget from the filter maps or imported directly. */
export function getFilterComparatorType(
	component: Component | string | null | undefined,
): FilterComparatorType | undefined {
	if (!component || typeof component === 'string') return undefined;
	// toRaw: a component passed through reactive state (a host's filter list) arrives proxied.
	const byWrapper = BY_WRAPPER.get(toRaw(component));
	if (byWrapper) return byWrapper;
	const meta = component as { __name?: string; name?: string; __asyncResolved?: { __name?: string } };
	const name = meta.__asyncResolved?.__name ?? meta.__name ?? meta.name;
	return name ? FILTER_COMPARATOR_TYPES[name] : undefined;
}

/**
 * The dialog's `getComparatorType()`: which comparator list a host shows next to the widget.
 * `nonComparable` means the widget renders its own (a "smart" filter) or none at all.
 */
export function getComparatorFamily(type: FilterComparatorType | undefined): 'text' | 'number' | 'nonComparable' {
	if (type === 'text') return 'text';
	if (type === 'number' || type === 'datetime') return 'number';
	return 'nonComparable';
}

/** True for the widgets the dialog wraps in `DefaultFilter` (text, number and datetime families). */
export function usesDefaultFilter(component: Component | string | null | undefined): boolean {
	return getComparatorFamily(getFilterComparatorType(component)) !== 'nonComparable';
}

/** `DefaultFilter`'s comparators around a `text` widget. */
export const TEXT_COMPARATORS: SelectOption<string>[] = [
	{ value: 'startswith', label: 'starts with' },
	{ value: 'endswith', label: 'ends with' },
	{ value: 'eq', label: 'equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'icontains', label: 'not contains' },
	{ value: 'empty', label: 'is empty' },
];

/** `DefaultFilter`'s comparators around a `number` / `datetime` widget. */
export const NUMBER_COMPARATORS: SelectOption<string>[] = [
	{ value: 'eq', label: 'equal' },
	{ value: 'gt', label: 'greater than' },
	{ value: 'lt', label: 'less than' },
	{ value: 'gte', label: 'greater than or equal' },
	{ value: 'lte', label: 'less than or equal' },
	{ value: 'in', label: 'in' },
	{ value: 'between', label: 'between' },
];
