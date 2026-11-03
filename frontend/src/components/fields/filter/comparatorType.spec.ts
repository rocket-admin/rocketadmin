import { describe, expect, it } from 'vitest';
import { defineAsyncComponent, defineComponent, reactive } from 'vue';
import { filterTypes, UIwidgets } from '@/consts/filter-types';
import BinaryFilter from './BinaryFilter.vue';
import { getComparatorFamily, getFilterComparatorType, usesDefaultFilter } from './comparatorType';
import DateFilter from './DateFilter.vue';
import TextFilter from './TextFilter.vue';

describe('getFilterComparatorType', () => {
	it('reads the Angular static type off the filter-types wrappers', () => {
		expect(getFilterComparatorType(UIwidgets.String)).toBe('text');
		expect(getFilterComparatorType(UIwidgets.Textarea)).toBe('text');
		expect(getFilterComparatorType(UIwidgets.Number)).toBe('number');
		expect(getFilterComparatorType(UIwidgets.TimeInterval)).toBe('number');
		expect(getFilterComparatorType(UIwidgets.Date)).toBe('datetime');
		expect(getFilterComparatorType(UIwidgets.Time)).toBe('datetime');
		expect(getFilterComparatorType(UIwidgets.File)).toBe('file');
		expect(getFilterComparatorType(UIwidgets.Timezone)).toBe('timezone');
		expect(getFilterComparatorType(filterTypes.postgres['character varying'])).toBe('text');
		expect(getFilterComparatorType(filterTypes.mysql.int)).toBe('number');
	});

	it('is undefined for the smart filters and the Default entry', () => {
		expect(getFilterComparatorType(UIwidgets.DateTime)).toBeUndefined();
		expect(getFilterComparatorType(UIwidgets.Email)).toBeUndefined();
		expect(getFilterComparatorType(UIwidgets.Boolean)).toBeUndefined();
		expect(getFilterComparatorType(UIwidgets.Default)).toBeUndefined();
		expect(getFilterComparatorType(undefined)).toBeUndefined();
	});

	it('works for SFCs imported directly, proxied or not', () => {
		expect(getFilterComparatorType(TextFilter)).toBe('text');
		expect(getFilterComparatorType(DateFilter)).toBe('datetime');
		expect(getFilterComparatorType(BinaryFilter)).toBeUndefined();
		expect(getFilterComparatorType(reactive({ widget: UIwidgets.Number }).widget)).toBe('number');
		expect(getFilterComparatorType(defineComponent({ name: 'Other' }))).toBeUndefined();
		expect(getFilterComparatorType(defineAsyncComponent(() => import('./TextFilter.vue')))).toBeUndefined();
	});
});

describe('getComparatorFamily / usesDefaultFilter', () => {
	it('maps the types to the dialog comparator families', () => {
		expect(getComparatorFamily('text')).toBe('text');
		expect(getComparatorFamily('number')).toBe('number');
		expect(getComparatorFamily('datetime')).toBe('number');
		expect(getComparatorFamily('file')).toBe('nonComparable');
		expect(getComparatorFamily(undefined)).toBe('nonComparable');
	});

	it('wraps only the text, number and datetime widgets', () => {
		expect(usesDefaultFilter(UIwidgets.String)).toBe(true);
		expect(usesDefaultFilter(UIwidgets.Date)).toBe(true);
		expect(usesDefaultFilter(UIwidgets.Timezone)).toBe(false);
		expect(usesDefaultFilter(UIwidgets.Select)).toBe(false);
	});
});
