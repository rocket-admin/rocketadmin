import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { type AutocompleteOption, UiAutocomplete } from '@/components/ui';
import type { TableForeignKey } from '@/models/table';
import { useConnectionsStore } from '@/stores/connections';
import { useTablesStore } from '@/stores/tables';
import { mockStructure, mockWidgetStructure } from '../stories.mocks';
import ForeignKeyEdit from './ForeignKeyEdit.vue';

interface Suggestion {
	displayString: string;
	primaryKeys?: Record<string, unknown>;
	fieldValue?: unknown;
	isNullOption?: boolean;
}

const rows = [
	{ id: 33, firstname: 'Alex', lastname: 'Taylor', email: 'new-user-5@email.com', age: 24 },
	{ id: 34, firstname: 'Alex', lastname: 'Johnson', email: 'new-user-4@email.com', age: 24 },
	{ id: 35, firstname: 'Alex', lastname: 'Smith', email: 'some-new@email.com', age: 24 },
];
const primaryColumns = [{ column_name: 'id', data_type: 'integer' }];
const usersTable = { rows, primaryColumns };

const relations: TableForeignKey = {
	autocomplete_columns: ['firstname', 'lastname', 'email'],
	column_name: 'userId',
	constraint_name: '',
	referenced_column_name: 'id',
	referenced_table_name: 'users',
	column_default: '',
};

let fetchTable: MockInstance;

function mountFk(props: Record<string, unknown> = {}) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
	return mount(ForeignKeyEdit, {
		props: { label: 'user_id', relations, structure: mockStructure({ allow_null: false }), ...props },
		global: { plugins: [router] },
	});
}

const suggestions = (wrapper: ReturnType<typeof mount>) =>
	(
		wrapper.findComponent(UiAutocomplete).props() as unknown as { options: AutocompleteOption<Suggestion>[] }
	).options.map((o) => o.value);

/** Responds to the mount's two requests: the current row, then the first suggestions. */
function respond(...responses: unknown[]) {
	for (const response of responses) fetchTable.mockResolvedValueOnce(response);
}

describe('ForeignKeyEdit', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useConnectionsStore().connectionID = '12345678';
		fetchTable = vi.spyOn(useTablesStore(), 'fetchTable');
	});

	afterEach(() => vi.useRealTimers());

	it('loads suggestions labelled by the identity column', async () => {
		respond(usersTable, { ...usersTable, identity_column: 'lastname' });
		const wrapper = mountFk({ value: '' });
		await flushPromises();
		expect(suggestions(wrapper)).toEqual([
			{ displayString: 'Taylor (Alex | new-user-5@email.com)', primaryKeys: { id: 33 }, fieldValue: 33 },
			{ displayString: 'Johnson (Alex | new-user-4@email.com)', primaryKeys: { id: 34 }, fieldValue: 34 },
			{ displayString: 'Smith (Alex | some-new@email.com)', primaryKeys: { id: 35 }, fieldValue: 35 },
		]);
		expect(fetchTable).toHaveBeenLastCalledWith({
			connectionID: '12345678',
			tableName: 'users',
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: '',
			referencedColumn: 'id',
		});
	});

	it('loads suggestions from the autocomplete columns without an identity column', async () => {
		respond(usersTable, usersTable);
		const wrapper = mountFk({ value: '' });
		await flushPromises();
		expect(suggestions(wrapper).map((s) => s.displayString)).toEqual([
			'Alex | Taylor | new-user-5@email.com',
			'Alex | Johnson | new-user-4@email.com',
			'Alex | Smith | some-new@email.com',
		]);
	});

	it('uses every non-empty column without autocomplete columns', async () => {
		respond(usersTable, usersTable);
		const wrapper = mountFk({ value: '', relations: { ...relations, autocomplete_columns: [] } });
		await flushPromises();
		expect(suggestions(wrapper)[0]?.displayString).toBe('33 | Alex | Taylor | new-user-5@email.com | 24');
	});

	it('shows the current row and links to it', async () => {
		respond({ rows: [rows[1]], primaryColumns }, usersTable);
		const wrapper = mountFk({ value: 34 });
		await flushPromises();
		expect(fetchTable.mock.calls[0]?.[0]).toMatchObject({
			chunkSize: 10,
			foreignKeyRowName: 'id',
			foreignKeyRowValue: '34',
		});
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Alex | Johnson | new-user-4@email.com');
		const link = wrapper.find('a.foreign-key-edit__link');
		expect(link.attributes('href')).toBe('/dashboard/12345678/users/entry?id=34');
		expect(link.attributes('target')).toBe('_blank');
	});

	it('links the hint to the referenced table settings', async () => {
		respond(usersTable, usersTable);
		const wrapper = mountFk();
		await flushPromises();
		expect(wrapper.find('.foreign-key-edit__hint a').attributes('href')).toBe('/dashboard/12345678/users/settings');
		expect(wrapper.find('a.foreign-key-edit__link').exists()).toBe(false);
	});

	it('takes the relation from the widget params when configured', async () => {
		respond(usersTable, usersTable);
		mountFk({
			relations: undefined,
			widgetStructure: mockWidgetStructure({ ...relations, referenced_table_name: 'customers' }),
		});
		await flushPromises();
		expect(fetchTable.mock.calls[0]?.[0]).toMatchObject({ tableName: 'customers' });
	});

	it('emits the field value when the text matches a suggestion, after the debounce', async () => {
		respond(usersTable, usersTable);
		const wrapper = mountFk();
		await flushPromises();
		vi.useFakeTimers();
		await wrapper.find('input').setValue('Alex | Johnson | new-user-4@email.com');
		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		await vi.advanceTimersByTimeAsync(500);
		expect(wrapper.emitted('fieldChange')).toEqual([[34]]);
		expect(fetchTable).toHaveBeenCalledTimes(2);
	});

	it('searches the referenced table for typed text', async () => {
		respond(usersTable, usersTable, {
			rows: [{ id: 23, firstname: 'John', lastname: 'Taylor', email: 'new-user-0@email.com', age: 24 }],
			primaryColumns,
			identity_column: 'lastname',
		});
		const wrapper = mountFk();
		await flushPromises();
		vi.useFakeTimers();
		await wrapper.find('input').setValue('John');
		await vi.advanceTimersByTimeAsync(500);
		expect(fetchTable).toHaveBeenLastCalledWith({
			connectionID: '12345678',
			tableName: 'users',
			requstedPage: 1,
			chunkSize: 20,
			foreignKeyRowName: 'autocomplete',
			foreignKeyRowValue: 'John',
			referencedColumn: 'id',
		});
		expect(suggestions(wrapper)).toEqual([
			{ displayString: 'Taylor (John | new-user-0@email.com)', primaryKeys: { id: 23 }, fieldValue: 23 },
		]);
	});

	it('shows a disabled "no matches" row for an empty search', async () => {
		respond(usersTable, usersTable, { rows: [] });
		const wrapper = mountFk();
		await flushPromises();
		vi.useFakeTimers();
		await wrapper.find('input').setValue('skjfhskjdf');
		await vi.advanceTimersByTimeAsync(500);
		const options = (
			wrapper.findComponent(UiAutocomplete).props() as unknown as { options: AutocompleteOption<Suggestion>[] }
		).options;
		expect(options).toEqual([
			{
				value: { displayString: 'No field starts with "skjfhskjdf" in foreign entity.' },
				label: expect.any(String),
				disabled: true,
			},
		]);
	});

	it('emits null when the text is cleared', async () => {
		respond(usersTable, usersTable, usersTable);
		const wrapper = mountFk();
		await flushPromises();
		vi.useFakeTimers();
		await wrapper.find('input').setValue('');
		await vi.advanceTimersByTimeAsync(500);
		expect(wrapper.emitted('fieldChange')?.[0]).toEqual([null]);
	});

	describe('nullable column', () => {
		const nullable = mockStructure({ allow_null: true });

		it('appends a "— empty" option for a nullable column', async () => {
			respond(usersTable, usersTable);
			const wrapper = mountFk({ structure: nullable });
			await flushPromises();
			const list = suggestions(wrapper);
			expect(list).toHaveLength(4);
			expect(list.at(-1)).toEqual({ displayString: '— empty', fieldValue: null, isNullOption: true });
		});

		it('appends it for widget_params.allow_null too', async () => {
			respond(usersTable, usersTable);
			const wrapper = mountFk({ widgetStructure: mockWidgetStructure({ ...relations, allow_null: true }) });
			await flushPromises();
			expect(suggestions(wrapper).at(-1)?.isNullOption).toBe(true);
		});

		it('keeps it when a search finds nothing', async () => {
			respond(usersTable, usersTable, { rows: [] });
			const wrapper = mountFk({ structure: nullable });
			await flushPromises();
			vi.useFakeTimers();
			await wrapper.find('input').setValue('nomatches');
			await vi.advanceTimersByTimeAsync(500);
			expect(suggestions(wrapper)).toEqual([
				{ displayString: 'No field starts with "nomatches" in foreign entity.' },
				{ displayString: '— empty', fieldValue: null, isNullOption: true },
			]);
		});

		it('emits null and drops the related link when picked', async () => {
			respond({ rows: [rows[0]], primaryColumns }, usersTable);
			const wrapper = mountFk({ structure: nullable, value: 33 });
			await flushPromises();
			expect(wrapper.find('a.foreign-key-edit__link').exists()).toBe(true);
			const options = (
				wrapper.findComponent(UiAutocomplete).props() as unknown as { options: AutocompleteOption<Suggestion>[] }
			).options;
			wrapper.findComponent(UiAutocomplete).vm.$emit('select', options.at(-1));
			await flushPromises();
			expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
			expect(wrapper.find('a.foreign-key-edit__link').exists()).toBe(false);
		});
	});
});
