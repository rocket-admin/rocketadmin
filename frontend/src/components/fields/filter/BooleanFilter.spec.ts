import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DBtype } from '@/models/connection';
import { useConnectionsStore } from '@/stores/connections';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import BooleanFilter from './BooleanFilter.vue';

// The connections store pulls in the Cedar permissions engine; keep its wasm from loading.
vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: () => new Promise(() => {}) }));

const notNull = mockStructure({ column_name: 'banned', data_type: 'tinyint', allow_null: false });
const nullable = mockStructure({ column_name: 'banned', data_type: 'tinyint', allow_null: true });

function labels(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('label.ui-segmented__option').map((label) => label.text());
}

function checked(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('label.ui-segmented__option--selected').map((label) => label.text());
}

describe('BooleanFilter', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('emits the eq comparator on mount', () => {
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', structure: notNull } });
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq']]);
	});

	it.each([
		[0, 'No'],
		['0', 'No'],
		['F', 'No'],
		['N', 'No'],
		['false', 'No'],
		[false, 'No'],
		[1, 'Yes'],
		['T', 'Yes'],
		['Y', 'Yes'],
		['true', 'Yes'],
		[true, 'Yes'],
	])('maps %j to %s', (value, label) => {
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', value, structure: nullable } });
		expect(checked(wrapper)).toEqual([label]);
	});

	it('maps an absent value to Null', () => {
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', structure: nullable } });
		expect(checked(wrapper)).toEqual(['Null']);
	});

	it.each([null, ''])('maps %j to Null', (value) => {
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', value, structure: nullable } });
		expect(checked(wrapper)).toEqual(['Null']);
	});

	it('offers Null only for nullable columns or allow_null', () => {
		expect(labels(mount(BooleanFilter, { props: { label: 'banned', structure: notNull } }))).toEqual(['Yes', 'No']);
		expect(labels(mount(BooleanFilter, { props: { label: 'banned', structure: nullable } }))).toEqual([
			'Yes',
			'No',
			'Null',
		]);
		const fromParams = mount(BooleanFilter, {
			props: { label: 'banned', structure: notNull, widgetStructure: mockWidgetStructure({ allow_null: true }) },
		});
		expect(labels(fromParams)).toContain('Null');
	});

	it('emits booleans and eq for Postgres', async () => {
		useConnectionsStore().currentConnection.type = DBtype.Postgres;
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', structure: nullable } });
		const radios = wrapper.findAll('input[type="radio"]');
		await radios[0]?.setValue(true);
		await radios[1]?.setValue(true);
		await radios[2]?.setValue(true);
		expect(wrapper.emitted('fieldChange')).toEqual([[true], [false], [null]]);
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq'], ['eq'], ['eq'], ['eq']]);
	});

	it.each([DBtype.MySQL, DBtype.MSSQL, DBtype.Oracle])('emits 1 / 0 for %s', async (type) => {
		useConnectionsStore().currentConnection.type = type;
		const wrapper = mount(BooleanFilter, { props: { label: 'banned', structure: notNull } });
		const radios = wrapper.findAll('input[type="radio"]');
		await radios[0]?.setValue(true);
		await radios[1]?.setValue(true);
		expect(wrapper.emitted('fieldChange')).toEqual([[1], [0]]);
	});

	it('keeps the test id on the group', () => {
		const wrapper = mount(BooleanFilter, { props: { label: 'banned' } });
		expect(wrapper.find('[data-testid="record-banned-boolean-radio-group"]').attributes('role')).toBe('radiogroup');
	});
});
