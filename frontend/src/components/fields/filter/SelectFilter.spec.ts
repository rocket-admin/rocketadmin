import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import SelectFilter from './SelectFilter.vue';

const base = mockStructure({
	column_name: 'status',
	data_type: 'enum',
	data_type_params: ['active', 'pending', 'archived'],
	allow_null: false,
});
const nullable = { ...base, allow_null: true };

function options(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('option').map((option) => option.text());
}

function selected(wrapper: ReturnType<typeof mount>) {
	return Array.from((wrapper.find('select').element as HTMLSelectElement).selectedOptions).map((o) => o.text);
}

async function pick(wrapper: ReturnType<typeof mount>, labels: string[]) {
	const select = wrapper.find('select').element as HTMLSelectElement;
	for (const option of Array.from(select.options)) option.selected = labels.includes(option.text);
	await wrapper.find('select').trigger('change');
}

describe('SelectFilter', () => {
	it('is a multiple select with options from data_type_params', () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: base } });
		expect((wrapper.find('[data-testid="record-status-select"]').element as HTMLSelectElement).multiple).toBe(true);
		expect(options(wrapper)).toEqual(['active', 'pending', 'archived']);
	});

	it('prepends a null option for a nullable column', () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: nullable } });
		expect(options(wrapper)).toEqual(['', 'active', 'pending', 'archived']);
	});

	it('prefers widget options, with allow_null', () => {
		const wrapper = mount(SelectFilter, {
			props: {
				label: 'status',
				structure: base,
				widgetStructure: mockWidgetStructure({ options: [{ value: 'a', label: 'Alpha' }], allow_null: true }),
			},
		});
		expect(options(wrapper)).toEqual(['', 'Alpha']);
	});

	it('restores the selection from a scalar, a null and an array value', () => {
		expect(selected(mount(SelectFilter, { props: { label: 's', structure: base } }))).toEqual([]);
		expect(selected(mount(SelectFilter, { props: { label: 's', structure: base, value: 'active' } }))).toEqual([
			'active',
		]);
		expect(selected(mount(SelectFilter, { props: { label: 's', structure: nullable, value: null } }))).toEqual(['']);
		expect(
			selected(mount(SelectFilter, { props: { label: 's', structure: base, value: ['active', 'pending'] } })),
		).toEqual(['active', 'pending']);
	});

	it('emits the eq comparator on mount', () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: base } });
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq']]);
	});

	it('emits in with the array for several values', async () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: base } });
		await pick(wrapper, ['active', 'pending']);
		expect(wrapper.emitted('fieldChange')).toEqual([[['active', 'pending']]]);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['in']);
	});

	it('emits eq with the scalar for one value, null included', async () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: nullable } });
		await pick(wrapper, ['active']);
		await pick(wrapper, ['']);
		expect(wrapper.emitted('fieldChange')).toEqual([['active'], [null]]);
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq'], ['eq'], ['eq']]);
	});

	it('emits undefined when the selection is cleared', async () => {
		const wrapper = mount(SelectFilter, { props: { label: 'status', structure: base, value: 'active' } });
		await pick(wrapper, []);
		expect(wrapper.emitted('fieldChange')).toEqual([[undefined]]);
	});
});
