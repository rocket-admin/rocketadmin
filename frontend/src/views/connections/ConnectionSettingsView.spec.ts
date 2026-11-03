import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { ApiError } from '@/api/client';
import type { TableProperties } from '@/models/table';
import ConnectionSettingsView from './ConnectionSettingsView.vue';
import { byText, mountConnectionView } from './connectionsTestUtils';

const connections = vi.hoisted(() => ({
	connection: { title: 'Writers', database: 'writers_db' },
	connectionTitle: 'Writers',
	canEditConnection: true,
	getConnectionSettings: vi.fn(),
	createConnectionSettings: vi.fn(),
	updateConnectionSettings: vi.fn(),
	deleteConnectionSettings: vi.fn(),
}));
const tables = vi.hoisted(() => ({ fetchTables: vi.fn() }));
const trackConnectionEvent = vi.hoisted(() => vi.fn());
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/components/connections/analytics', () => ({ trackConnectionEvent }));

const permissions = { visibility: true, readonly: false, add: true, delete: true, edit: true };
const mockTablesList: TableProperties[] = [
	{ table: 'customer', permissions },
	{ table: 'Orders', permissions, display_name: 'Created orders' },
	{ table: 'product', permissions },
];

const mockConnectionSettings = {
	primary_color: '#1F5CB8',
	secondary_color: '#F9D648',
	logo_url: 'https://example.com/logo.jpg',
	company_name: 'Such.Ukr.Lit',
	hidden_tables: ['Orders'],
	tables_audit: false,
	default_showing_table: 'customer',
};

const mockConnectionSettingsResponse = {
	id: '98a20557-6b38-46aa-b09b-d8a716421dd6',
	connectionId: '63f804e4-8588-4957-8d7f-655e2309fef7',
	...mockConnectionSettings,
};

const mountPage = () =>
	mountConnectionView(ConnectionSettingsView, '/connection-settings/:connectionId', '/connection-settings/12345678');

const saveButton = (wrapper: VueWrapper) => wrapper.find('[data-testid="connection-settings-save-button"]');

describe('ConnectionSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tables.fetchTables.mockResolvedValue(mockTablesList);
		connections.getConnectionSettings.mockResolvedValue(null);
		connections.createConnectionSettings.mockResolvedValue({});
		connections.updateConnectionSettings.mockResolvedValue({});
		connections.deleteConnectionSettings.mockResolvedValue(undefined);
		connections.canEditConnection = true;
	});

	it('loads the hidden tables list and names tables by display name or normalized name', async () => {
		const { wrapper } = await mountPage();

		expect(tables.fetchTables).toHaveBeenCalledWith('12345678', true);
		expect(document.title).toBe('Settings - Writers | Rocketadmin');
		expect(wrapper.find('h1').text()).toBe('Settings for Writers connection');
		const options = wrapper.findAll('select[name="hidden_tables"] option').map((option) => option.text());
		expect(options).toEqual(['Customers (customer)', 'Created orders (Orders)', 'Products (product)']);
		wrapper.unmount();
	});

	it('shows a banner when the connection has no tables', async () => {
		tables.fetchTables.mockResolvedValue([]);
		const { wrapper } = await mountPage();

		expect(wrapper.text()).toContain('Rocketadmin can not find any tables');
		expect(wrapper.find('form').exists()).toBe(false);
		wrapper.unmount();
	});

	it('shows the server error with a link to the credentials', async () => {
		tables.fetchTables.mockRejectedValue(
			new ApiError('Connection error', 400, { message: 'Connection error', originalMessage: 'Error details' }),
		);
		const { wrapper } = await mountPage();

		const banner = wrapper.find('[data-testid="connection-settings-server-error"]');
		expect(banner.text()).toContain('Connection error');
		expect(banner.text()).toContain('Error details');
		expect(byText(wrapper, 'Check database credentials').attributes('href')).toBe('/edit-db/12345678');
		wrapper.unmount();
	});

	it('fills the form from existing settings', async () => {
		connections.getConnectionSettings.mockResolvedValue(mockConnectionSettingsResponse);
		const { wrapper } = await mountPage();

		expect(connections.getConnectionSettings).toHaveBeenCalledWith('12345678');
		expect((wrapper.find('input[name="logo-url"]').element as HTMLInputElement).value).toBe(
			'https://example.com/logo.jpg',
		);
		expect((wrapper.find('input[name="primary-color"]').element as HTMLInputElement).value).toBe('#1F5CB8');
		const hidden = wrapper.find('select[name="hidden_tables"]').element as HTMLSelectElement;
		expect(Array.from(hidden.selectedOptions).map((option) => option.text)).toEqual(['Created orders (Orders)']);
		expect((wrapper.find('input[name="audit"]').element as HTMLInputElement).checked).toBe(false);
		expect(byText(wrapper, 'Reset').attributes('disabled')).toBeUndefined();
		wrapper.unmount();
	});

	it('starts from empty settings with Reset and Save disabled', async () => {
		const { wrapper } = await mountPage();

		expect((wrapper.find('input[name="audit"]').element as HTMLInputElement).checked).toBe(true);
		expect(byText(wrapper, 'Reset').attributes('disabled')).toBeDefined();
		expect(saveButton(wrapper).attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});

	it('creates the settings on the first save', async () => {
		const { wrapper } = await mountPage();

		await wrapper.find('input[name="primary-color"]').setValue('#1F5CB8');
		expect(saveButton(wrapper).attributes('disabled')).toBeUndefined();
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(connections.createConnectionSettings).toHaveBeenCalledWith('12345678', {
			hidden_tables: [],
			default_showing_table: null,
			primary_color: '#1F5CB8',
			secondary_color: '',
			logo_url: '',
			company_name: '',
			tables_audit: true,
		});
		expect(trackConnectionEvent).toHaveBeenCalledWith(
			'Connection settings: settings is created successfully',
			expect.objectContaining({ primary_color: true, hidden_tables: false }),
			undefined,
		);
		expect(connections.getConnectionSettings).toHaveBeenCalledTimes(2);
		wrapper.unmount();
	});

	it('updates existing settings', async () => {
		connections.getConnectionSettings.mockResolvedValue(mockConnectionSettingsResponse);
		const { wrapper } = await mountPage();

		await wrapper.find('input[name="audit"]').setValue(true);
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(connections.updateConnectionSettings).toHaveBeenCalledWith(
			'12345678',
			expect.objectContaining({ ...mockConnectionSettings, tables_audit: true }),
		);
		expect(connections.createConnectionSettings).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it('resets the settings', async () => {
		connections.getConnectionSettings.mockResolvedValue(mockConnectionSettingsResponse);
		const { wrapper } = await mountPage();

		await byText(wrapper, 'Reset').trigger('click');
		await flushPromises();

		expect(connections.deleteConnectionSettings).toHaveBeenCalledWith('12345678');
		expect(trackConnectionEvent).toHaveBeenCalledWith('Connection settings: settings is reset successfully');
		wrapper.unmount();
	});

	it('hides the actions from users who cannot edit the connection', async () => {
		connections.canEditConnection = false;
		const { wrapper } = await mountPage();

		expect(saveButton(wrapper).exists()).toBe(false);
		wrapper.unmount();
	});
});
