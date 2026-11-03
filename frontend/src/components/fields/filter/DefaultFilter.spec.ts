import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { UIwidgets } from '@/consts/filter-types';
import DateFilter from './DateFilter.vue';
import DefaultFilter from './DefaultFilter.vue';
import { comparatorLabels, pickComparator, selectedComparator } from './filterTestUtils';
import NumberFilter from './NumberFilter.vue';
import TextFilter from './TextFilter.vue';

describe('DefaultFilter', () => {
	it('offers text comparators around a text widget', () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'name', valueComponent: TextFilter } });
		expect(comparatorLabels(wrapper)).toEqual([
			'starts with',
			'ends with',
			'equal',
			'contains',
			'not contains',
			'is empty',
		]);
	});

	it('offers number comparators, with in and between, around number and datetime widgets', () => {
		const expected = [
			'equal',
			'greater than',
			'less than',
			'greater than or equal',
			'less than or equal',
			'in',
			'between',
		];
		expect(comparatorLabels(mount(DefaultFilter, { props: { label: 'n', valueComponent: NumberFilter } }))).toEqual(
			expected,
		);
		expect(comparatorLabels(mount(DefaultFilter, { props: { label: 'd', valueComponent: DateFilter } }))).toEqual(
			expected,
		);
	});

	it('resolves the lazy widgets from the filter-types map', async () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'name', value: 'Ada', valueComponent: UIwidgets.String } });
		expect(comparatorLabels(wrapper)).toContain('not contains');
		await flushPromises();
		await new Promise((resolve) => setTimeout(resolve));
		await flushPromises();
		expect((wrapper.find('[data-testid="record-name-text"]').element as HTMLInputElement).value).toBe('Ada');
	});

	it('emits the initial comparator on mount', () => {
		const wrapper = mount(DefaultFilter, {
			props: { label: 'name', comparator: 'contains', valueComponent: TextFilter },
		});
		expect(selectedComparator(wrapper)).toBe('contains');
		expect(wrapper.emitted('comparatorChange')).toEqual([['contains']]);
	});

	it('renders the widget with the value and re-emits its changes', async () => {
		const wrapper = mount(DefaultFilter, {
			props: { label: 'name', fieldKey: 'k', value: 'foo', valueComponent: TextFilter },
		});
		const input = wrapper.find('[data-testid="record-name-text"]');
		expect((input.element as HTMLInputElement).value).toBe('foo');
		await input.setValue('bar');
		expect(wrapper.emitted('fieldChange')).toEqual([['bar']]);
	});

	it('emits "" and makes the widget readonly for is empty', async () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'name', value: 'foo', valueComponent: TextFilter } });
		await pickComparator(wrapper, 'is empty');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['empty']);
		const input = wrapper.find('[data-testid="record-name-text"]').element as HTMLInputElement;
		expect(input.readOnly).toBe(true);
		expect(input.value).toBe('');
	});

	it('emits only the comparator for other selections', async () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'name', value: 'foo', valueComponent: TextFilter } });
		await pickComparator(wrapper, 'contains');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['contains']);
	});

	it('clears the value when switching to in, then parses comma-separated text', async () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'age', value: '42', valueComponent: NumberFilter } });
		await pickComparator(wrapper, 'in');
		expect(wrapper.emitted('fieldChange')).toEqual([[undefined]]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['in']);

		await wrapper.find('input').setValue('1, 2,3 , 4');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([['1', '2', '3', '4']]);
		await wrapper.find('input').setValue('   ');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([undefined]);
	});

	it('restores the in text from an array value', () => {
		const wrapper = mount(DefaultFilter, {
			props: { label: 'age', comparator: 'in', value: ['1', '2', '3'], valueComponent: NumberFilter },
		});
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('1, 2, 3');
	});

	it('renders the widget twice for between and emits [lower, upper]', async () => {
		const wrapper = mount(DefaultFilter, { props: { label: 'age', fieldKey: 'k', valueComponent: NumberFilter } });
		await pickComparator(wrapper, 'between');
		expect(wrapper.emitted('fieldChange')).toEqual([[undefined]]);

		const lower = wrapper.find('[data-testid="record-age (from)-number"]');
		const upper = wrapper.find('[data-testid="record-age (to)-number"]');
		expect(lower.attributes('name')).toBe('age (from)-k-lower');
		await lower.setValue('10');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([[10, undefined]]);
		await upper.setValue('20');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual([[10, 20]]);
	});

	it('restores the between bounds from a two-element array', () => {
		const wrapper = mount(DefaultFilter, {
			props: { label: 'age', comparator: 'between', value: [5, 15], valueComponent: NumberFilter },
		});
		expect(wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)).toEqual(['5', '15']);
	});

	it('does not clear the value when re-selecting the current in / between', async () => {
		const wrapper = mount(DefaultFilter, {
			props: { label: 'age', comparator: 'between', value: [5, 15], valueComponent: NumberFilter },
		});
		await pickComparator(wrapper, 'between');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
	});
});
