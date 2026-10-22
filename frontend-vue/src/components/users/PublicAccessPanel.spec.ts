import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { vTooltip } from '@/components/ui';
import type { PublicPermissions } from '@/models/user';
import PublicAccessPanel from './PublicAccessPanel.vue';
import { buttonByText } from './testUtils';

const CONNECTION_ID = '5a2d4e0c-6d3a-4b0f-9d1a-4a0f0a4c8b11';

const { users, tables, posthog } = vi.hoisted(() => ({
	users: {
		publicPermissions: { enabled: false, tables: [] } as PublicPermissions,
		publicPermissionsLoading: false,
		loadPublicPermissions: vi.fn(),
		savePublicPermissions: vi.fn(),
	},
	tables: { fetchTables: vi.fn(), fetchTableStructure: vi.fn() },
	posthog: { capture: vi.fn() },
}));

const usersState = reactive(users);

vi.mock('@/stores/users', () => ({ useUsersStore: () => usersState }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => ({ connectionID: CONNECTION_ID }) }));
vi.mock('posthog-js', () => ({ default: posthog }));

const fakeTables = [
	{ table: 'customers', display_name: 'Customers' },
	{ table: 'orders', display_name: '' },
];

const fakeStructure = { structure: [{ column_name: 'id' }, { column_name: 'name' }, { column_name: 'secret' }] };

async function mountPanel(): Promise<VueWrapper> {
	const wrapper = mount(PublicAccessPanel, { global: { directives: { tooltip: vTooltip } } });
	await flushPromises();
	return wrapper;
}

async function expand(wrapper: VueWrapper) {
	await wrapper.find('.ui-expansion-panel__toggle').trigger('click');
	await flushPromises();
}

function tableRow(wrapper: VueWrapper, name: string) {
	const row = wrapper
		.findAll('[data-testid="public-access-table"]')
		.find((candidate) => candidate.text().includes(name));
	if (!row) throw new Error(`No row ${name}`);
	return row;
}

async function toggle(wrapper: VueWrapper, name: string, checked: boolean) {
	await tableRow(wrapper, name).find('input[type="checkbox"]').setValue(checked);
	await flushPromises();
}

function status(wrapper: VueWrapper): string {
	return wrapper.find('[data-testid="public-access-status"]').text();
}

async function setStored(permissions: PublicPermissions) {
	usersState.publicPermissions = permissions;
	await flushPromises();
}

describe('PublicAccessPanel', () => {
	beforeEach(() => {
		usersState.publicPermissions = { enabled: false, tables: [] };
		usersState.publicPermissionsLoading = false;
		vi.clearAllMocks();
		users.savePublicPermissions.mockResolvedValue(undefined);
		tables.fetchTables.mockResolvedValue(fakeTables);
		tables.fetchTableStructure.mockResolvedValue(fakeStructure);
	});

	it('opts in to loading the public permissions of this connection', async () => {
		const wrapper = await mountPanel();
		expect(usersState.loadPublicPermissions).toHaveBeenCalledWith(CONNECTION_ID);
		wrapper.unmount();
	});

	it('lists the connection tables, falling back to a normalized name', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);

		expect(tables.fetchTables).toHaveBeenCalledWith(CONNECTION_ID);
		const rows = wrapper.findAll('[data-testid="public-access-table"]').map((row) => row.text());
		expect(rows).toEqual(['Customers', 'Orders']);
		expect(wrapper.text()).toContain('Anyone on the internet can read the tables listed below');
		wrapper.unmount();
	});

	it('reports Disabled and offers no disable button when nothing is public', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);
		expect(status(wrapper)).toBe('Disabled');
		expect(wrapper.text()).not.toContain('Disable public access');
		wrapper.unmount();
	});

	it('seeds the selection from the stored permissions and preloads every stored table columns', async () => {
		const wrapper = await mountPanel();
		await setStored({
			enabled: true,
			tables: [{ tableName: 'customers', readableColumns: ['id', 'name'] }, { tableName: 'orders' }],
		});
		await expand(wrapper);

		expect(status(wrapper)).toBe('2 tables');
		expect(tables.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'customers');
		expect(tables.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'orders');

		const customers = tableRow(wrapper, 'Customers').find('select').element as HTMLSelectElement;
		expect(Array.from(customers.selectedOptions).map((option) => option.text)).toEqual(['id', 'name']);
		const orders = tableRow(wrapper, 'Orders').find('select').element as HTMLSelectElement;
		expect(Array.from(orders.options).map((option) => option.text)).toEqual(['id', 'name', 'secret']);
		expect(orders.selectedOptions).toHaveLength(0);
		expect(wrapper.text()).toContain('Disable public access');
		wrapper.unmount();
	});

	it('singularizes the status for one table', async () => {
		const wrapper = await mountPanel();
		await setStored({ enabled: true, tables: [{ tableName: 'customers' }] });
		expect(status(wrapper)).toBe('1 table');
		wrapper.unmount();
	});

	it('fetches columns when a table is checked, once', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);

		await toggle(wrapper, 'Customers', true);
		expect(tables.fetchTableStructure).toHaveBeenCalledWith(CONNECTION_ID, 'customers');
		expect(wrapper.findAll('[data-testid="public-access-columns"]')).toHaveLength(1);

		await toggle(wrapper, 'Customers', false);
		await toggle(wrapper, 'Customers', true);
		expect(tables.fetchTableStructure).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});

	it('saves an empty column selection as undefined readableColumns', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);
		await toggle(wrapper, 'Customers', true);
		await buttonByText(wrapper, 'Save').trigger('click');

		expect(usersState.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'customers', readableColumns: undefined },
		]);
		expect(posthog.capture).toHaveBeenCalledWith('Users access: public access saved');
		wrapper.unmount();
	});

	it('saves an explicit column whitelist', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);
		await toggle(wrapper, 'Customers', true);

		const select = tableRow(wrapper, 'Customers').find('select');
		for (const option of Array.from((select.element as HTMLSelectElement).options)) {
			option.selected = option.text === 'id' || option.text === 'name';
		}
		await select.trigger('change');
		await buttonByText(wrapper, 'Save').trigger('click');

		expect(usersState.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'customers', readableColumns: ['id', 'name'] },
		]);
		wrapper.unmount();
	});

	it('drops an unchecked table from the payload', async () => {
		const wrapper = await mountPanel();
		await expand(wrapper);
		await toggle(wrapper, 'Customers', true);
		await toggle(wrapper, 'Orders', true);
		await toggle(wrapper, 'Customers', false);
		await buttonByText(wrapper, 'Save').trigger('click');

		expect(usersState.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, [
			{ tableName: 'orders', readableColumns: undefined },
		]);
		wrapper.unmount();
	});

	it('leaves the loader when the table list fails to load', async () => {
		tables.fetchTables.mockRejectedValue(new Error('boom'));
		const wrapper = await mountPanel();
		await expand(wrapper);
		expect(wrapper.text()).toContain('No tables in this connection.');
		wrapper.unmount();
	});

	it('blocks editing while a save is in flight', async () => {
		let resolveSave: () => void = () => {};
		users.savePublicPermissions.mockReturnValue(new Promise<void>((resolve) => (resolveSave = resolve)));
		const wrapper = await mountPanel();
		await expand(wrapper);
		await toggle(wrapper, 'Customers', true);

		await buttonByText(wrapper, 'Save').trigger('click');
		expect(tableRow(wrapper, 'Orders').find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
		expect(buttonByText(wrapper, 'Save').attributes('disabled')).toBeDefined();

		resolveSave();
		await flushPromises();
		expect(tableRow(wrapper, 'Orders').find('input[type="checkbox"]').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('disables public access by saving an empty table list', async () => {
		const wrapper = await mountPanel();
		await setStored({ enabled: true, tables: [{ tableName: 'customers' }] });
		await expand(wrapper);

		await buttonByText(wrapper, 'Disable public access').trigger('click');
		await flushPromises();

		expect(usersState.savePublicPermissions).toHaveBeenCalledWith(CONNECTION_ID, []);
		expect(posthog.capture).toHaveBeenCalledWith('Users access: public access disabled');
		expect(status(wrapper)).toBe('Disabled');
		wrapper.unmount();
	});
});
