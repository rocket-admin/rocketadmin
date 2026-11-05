import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TableForeignKey } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import ForeignKeyFilter from './ForeignKeyFilter.vue';

vi.mock('@/lib/cedar-wasm', () => ({ loadCedarWasm: () => new Promise(() => {}) }));

const usersTable = {
	rows: [
		{ id: 33, firstname: 'Alex', lastname: 'Taylor', email: 'new-user-5@email.com', age: 24 },
		{ id: 34, firstname: 'Alex', lastname: 'Johnson', email: 'new-user-4@email.com', age: 24 },
		{ id: 35, firstname: 'Alex', lastname: 'Smith', email: 'some-new@email.com', age: 24 },
	],
	primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
};

const relations: TableForeignKey = {
	autocomplete_columns: ['firstname', 'lastname', 'email'],
	column_name: 'userId',
	constraint_name: '',
	referenced_column_name: 'id',
	referenced_table_name: 'users',
	column_default: '',
};

const RouterLinkStub = { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' };

function mountFilter(props: Record<string, unknown> = {}) {
	return mount(ForeignKeyFilter, {
		props: { label: 'user_id', relations, ...props },
		global: { stubs: { RouterLink: RouterLinkStub } },
	});
}

function optionTexts(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('[role="option"]').map((option) => option.text());
}

describe('ForeignKeyFilter', () => {
	let fetchTable: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		useConnectionsStore().connectionID = '12345678';
		fetchTable = vi.spyOn(useTablesStore(), 'fetchTable');
	});

	afterEach(() => vi.useRealTimers());

	it('loads the current row and the suggestions, with the identity column', async () => {
		fetchTable.mockResolvedValue({ ...usersTable, identity_column: 'lastname' });
		const wrapper = mountFilter({ value: '33' });
		await flushPromises();

		expect(fetchTable).toHaveBeenNthCalledWith(1, {
			connectionID: '12345678',
			tableName: 'users',
			requstedPage: 1,
			chunkSize: 10,
			foreignKeyRowName: 'id',
			foreignKeyRowValue: '33',
		});
		expect(fetchTable).toHaveBeenNthCalledWith(2, {
			connectionID: '12345678',
			tableName: 'users',
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: '',
			referencedColumn: 'id',
		});
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Taylor (Alex | new-user-5@email.com)');
		expect(wrapper.emitted('fieldChange')).toEqual([[33]]);

		await wrapper.find('input').trigger('focus');
		expect(optionTexts(wrapper)).toEqual([
			'Taylor (Alex | new-user-5@email.com)',
			'Johnson (Alex | new-user-4@email.com)',
			'Smith (Alex | some-new@email.com)',
		]);
	});

	it('joins the autocomplete columns without an identity column', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter({ value: '33' });
		await flushPromises();
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Alex | Taylor | new-user-5@email.com');
	});

	it('joins every non-empty column without autocomplete columns', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter({ value: '33', relations: { ...relations, autocomplete_columns: [] } });
		await flushPromises();
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe(
			'33 | Alex | Taylor | new-user-5@email.com | 24',
		);
	});

	it('links to the related record', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter({ value: '33' });
		await flushPromises();
		const link = wrapper.find('a[aria-label="Show related record"]');
		expect(JSON.parse(link.attributes('data-to') ?? '{}')).toEqual({
			path: '/dashboard/12345678/users/entry',
			query: { id: '33' },
		});
	});

	it('emits the value of a typed suggestion after the debounce', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter();
		await flushPromises();
		vi.useFakeTimers();
		await wrapper.find('input').setValue('Alex | Johnson | new-user-4@email.com');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		vi.advanceTimersByTime(500);
		await flushPromises();
		expect(wrapper.emitted('fieldChange')).toEqual([[34]]);
		expect(fetchTable).toHaveBeenCalledTimes(2);
	});

	it('searches the referenced table for other text', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter();
		await flushPromises();
		fetchTable.mockResolvedValue({
			rows: [{ id: 23, firstname: 'John', lastname: 'Taylor', email: 'new-user-0@email.com', age: 24 }],
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
			identity_column: 'lastname',
		});
		vi.useFakeTimers();
		await wrapper.find('input').setValue('John');
		vi.advanceTimersByTime(500);
		await flushPromises();
		expect(fetchTable).toHaveBeenLastCalledWith({
			connectionID: '12345678',
			tableName: 'users',
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: 'John',
			referencedColumn: 'id',
		});
		expect(optionTexts(wrapper)).toEqual(['Taylor (John | new-user-0@email.com)']);
	});

	it('shows a disabled no-match row, and emits null for cleared text', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter({ value: '33' });
		await flushPromises();
		fetchTable.mockResolvedValue({ rows: [], primaryColumns: [] });
		vi.useFakeTimers();
		await wrapper.find('input').setValue('skjfhskjdf');
		vi.advanceTimersByTime(500);
		await flushPromises();
		const option = wrapper.find('[role="option"]');
		expect(option.text()).toBe('No field starts with "skjfhskjdf" in foreign entity.');
		expect(option.attributes('aria-disabled')).toBe('true');

		await wrapper.find('input').setValue('');
		vi.advanceTimersByTime(500);
		await flushPromises();
		expect(wrapper.emitted('fieldChange')).toContainEqual([null]);
	});

	it('points the link at a picked suggestion', async () => {
		fetchTable.mockResolvedValue(usersTable);
		const wrapper = mountFilter();
		await flushPromises();
		await wrapper.find('input').trigger('focus');
		await wrapper.findAll('[role="option"]')[2]?.trigger('click');
		const link = wrapper.find('a[aria-label="Show related record"]');
		expect(JSON.parse(link.attributes('data-to') ?? '{}').query).toEqual({ id: '35' });
	});
});
