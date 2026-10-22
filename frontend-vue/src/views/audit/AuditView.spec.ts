import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { ApiError } from '@/api/client';
import DialogHost from '@/components/dialog/DialogHost.vue';
import AuditView from './AuditView.vue';

const connections = vi.hoisted(() => ({
	connectionAccessLevel: 'edit' as string | null,
	fetchAuditLog: vi.fn(),
}));
const tables = vi.hoisted(() => ({ fetchTables: vi.fn() }));
const users = vi.hoisted(() => ({ fetchConnectionUsers: vi.fn() }));
const trackEvent = vi.hoisted(() => vi.fn());
const capture = vi.hoisted(() => vi.fn());
const environment = vi.hoisted(() => ({ saas: false }));

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/tables', () => ({ useTablesStore: () => tables }));
vi.mock('@/stores/users', () => ({ useUsersStore: () => users }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent }));
vi.mock('posthog-js', () => ({ default: { capture } }));
vi.mock('@/environment', () => ({ environment }));

const mockTables = [
	{ table: 'customers', permissions: {} },
	{ table: 'Orders', permissions: {}, display_name: 'Created orders' },
	{ table: 'product', permissions: {} },
];

const mockUsers = [
	{ id: '1', isActive: true, email: 'eric@cartman.ass', createdAt: '2021-09-03T10:29:48.100Z', name: 'Eric Cartman' },
	{ id: '2', isActive: true, email: 'kenny@mccormick.com', createdAt: '2021-09-03T10:29:48.100Z' },
];

const mockLogs = {
	logs: [
		{
			table_name: 'customers',
			email: 'eric@cartman.ass',
			operationType: 'updateRow',
			operationStatusResult: 'successfully',
			createdAt: '2021-06-26T19:22:00.603Z',
			old_data: { status: 'poor' },
			received_data: { status: 'poor and stupid' },
		},
		{
			table_name: 'product',
			email: 'kenny@mccormick.com',
			operationType: 'rowsReceived',
			operationStatusResult: 'unsuccessfully',
			createdAt: '2021-06-25T09:05:00.000Z',
			old_data: null,
			received_data: null,
		},
	],
	pagination: { total: 95, perPage: 30, currentPage: 1, lastPage: 4 },
};

let wrapper: VueWrapper | null = null;

async function mountPage() {
	setActivePinia(createPinia());
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/audit/:connectionId', component: AuditView },
			{ path: '/:pathMatch(.*)*', component: { render: () => h('div') } },
		],
	});
	router.push('/audit/conn-1');
	await router.isReady();
	const Host = defineComponent({ render: () => [h(RouterView), h(DialogHost)] });
	wrapper = mount(Host, { global: { plugins: [router] }, attachTo: document.body });
	await flushPromises();
	return wrapper;
}

function lastLogRequest() {
	return connections.fetchAuditLog.mock.calls.at(-1)?.[0];
}

function mockMobile(matches: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
	);
}

describe('AuditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connections.connectionAccessLevel = 'edit';
		environment.saas = false;
		connections.fetchAuditLog.mockResolvedValue(mockLogs);
		tables.fetchTables.mockResolvedValue(mockTables);
		users.fetchConnectionUsers.mockResolvedValue(mockUsers);
		mockMobile(false);
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = null;
		vi.unstubAllGlobals();
	});

	it('loads the first page of the log with no filters, plus the tables and users', async () => {
		const page = await mountPage();

		expect(connections.fetchAuditLog).toHaveBeenCalledWith({
			connectionID: 'conn-1',
			tableName: 'showAll',
			userEmail: 'showAll',
			requstedPage: 1,
			chunkSize: 30,
		});
		expect(tables.fetchTables).toHaveBeenCalledWith('conn-1');
		expect(users.fetchConnectionUsers).toHaveBeenCalledWith('conn-1');
		expect(document.title).toBe('Connections | Rocketadmin');
		expect(page.find('h1').text()).toBe('Audit');
		expect(page.text()).toContain('1 – 30 of 95');
	});

	it('renders the log rows with user names, actions, statuses and dates', async () => {
		const page = await mountPage();
		const rows = page.findAll('[data-testid="audit-table"] tbody tr');
		expect(rows).toHaveLength(2);

		expect(rows[0]?.text()).toContain('Eric Cartman');
		expect(rows[0]?.text()).toContain('eric@cartman.ass');
		expect(rows[0]?.text()).toContain('customers');
		expect(rows[0]?.text()).toContain('Edited');
		expect(rows[0]?.text()).toContain('successfully');
		expect(rows[0]?.text()).toContain('26 Jun 2021');

		expect(rows[1]?.text()).toContain('kenny@mccormick.com');
		expect(rows[1]?.text()).toContain('Viewed');
		expect(rows[1]?.text()).toContain('unsuccessfully');
	});

	it('offers the tables by display name or normalized name, and the users by email', async () => {
		const page = await mountPage();
		const tableOptions = page.findAll('[data-testid="audit-table-select"] option').map((option) => option.text());
		expect(tableOptions).toEqual([
			'Show all',
			'Customers (customers)',
			'Created orders (Orders)',
			'Products (product)',
		]);

		const userOptions = page.findAll('[data-testid="audit-user-select"] option').map((option) => option.text());
		expect(userOptions).toEqual(['Show all', 'eric@cartman.ass', 'kenny@mccormick.com']);
	});

	it('refetches the log when a table or a user is chosen', async () => {
		const page = await mountPage();

		await page.find('[data-testid="audit-table-select"]').trigger('click');
		expect(trackEvent).toHaveBeenCalledWith('Audit: table is selected');
		expect(capture).toHaveBeenCalledWith('Audit: table is selected');

		await page.find('[data-testid="audit-table-select"]').setValue('2');
		await flushPromises();
		expect(lastLogRequest()).toMatchObject({ tableName: 'Orders', userEmail: 'showAll' });

		await page.find('[data-testid="audit-user-select"]').setValue('2');
		await flushPromises();
		expect(lastLogRequest()).toMatchObject({ tableName: 'Orders', userEmail: 'kenny@mccormick.com' });
	});

	it('requests the next page from the server', async () => {
		const page = await mountPage();
		await page.find('[aria-label="Next page"]').trigger('click');
		await flushPromises();
		expect(lastLogRequest()).toMatchObject({ requstedPage: 2, chunkSize: 30 });
	});

	it('opens the log details dialog for a row', async () => {
		const page = await mountPage();
		const details = page.findAll('button').find((button) => button.text() === 'Details');
		await details?.trigger('click');
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledWith('Audit: view changes is clicked');
		expect(page.find('h2').text()).toBe('Log details');
		expect(page.find('[data-block="comparison-details"]').exists()).toBe(true);
	});

	it('shows the skeleton while the log loads', async () => {
		connections.fetchAuditLog.mockReturnValue(new Promise(() => {}));
		const page = await mountPage();
		expect(page.find('[aria-label="Loading audit log"]').exists()).toBe(true);
		expect(page.find('[data-testid="audit-table"]').isVisible()).toBe(false);
	});

	it('shows a banner and no table filter when the connection has no tables', async () => {
		tables.fetchTables.mockResolvedValue([]);
		const page = await mountPage();
		expect(page.find('[data-testid="audit-no-tables"]').text()).toContain('Rocketadmin can not find any tables');
		expect(page.find('[data-testid="audit-table-select"]').exists()).toBe(false);
		expect(page.find('[data-testid="audit-table"]').exists()).toBe(false);
	});

	it('shows the server error with a credentials link and a bug report link', async () => {
		tables.fetchTables.mockRejectedValue(
			new ApiError('Connection failed', 400, { message: 'Connection failed', originalMessage: 'ECONNREFUSED' }),
		);
		const page = await mountPage();
		const banner = page.find('[data-testid="audit-server-error"]');
		expect(banner.text()).toContain('Connection failed');
		expect(banner.text()).toContain('ECONNREFUSED');

		const links = banner.findAll('a');
		expect(links.find((link) => link.text() === 'Check database credentials')?.attributes('href')).toBe(
			'/edit-db/conn-1',
		);
		expect(links.find((link) => link.text() === 'Report a bug')?.attributes('href')).toBe(
			'https://github.com/rocket-admin/rocketadmin/issues',
		);
		expect(page.find('[data-testid="audit-user-select"]').exists()).toBe(false);
		expect(page.find('[data-testid="audit-table"]').exists()).toBe(false);
	});

	it('offers the support chat instead of a bug report on SaaS', async () => {
		environment.saas = true;
		connections.connectionAccessLevel = 'readonly';
		tables.fetchTables.mockRejectedValue(new ApiError('Oops', 500, { message: 'Oops' }));
		const intercom = vi.fn();
		vi.stubGlobal('Intercom', intercom);
		const page = await mountPage();
		const banner = page.find('[data-testid="audit-server-error"]');

		expect(banner.text()).not.toContain('Check database credentials');
		expect(banner.text()).not.toContain('Report a bug');
		await banner
			.findAll('button')
			.find((button) => button.text() === 'Chat with support')
			?.trigger('click');
		expect(intercom).toHaveBeenCalledWith('show');
	});

	it('does not load the users without access to the connection', async () => {
		connections.connectionAccessLevel = 'none';
		const page = await mountPage();
		expect(users.fetchConnectionUsers).not.toHaveBeenCalled();
		expect(page.find('[data-testid="audit-user-select"]').exists()).toBe(false);
	});

	it('renders a feed of cards grouped by day on small screens', async () => {
		mockMobile(true);
		const page = await mountPage();
		const feed = page.find('[data-testid="audit-feed"]');
		expect(page.find('[data-testid="audit-table"]').exists()).toBe(false);
		expect(feed.text()).toContain('26 Jun 2021');
		expect(feed.text()).toContain('25 Jun 2021');

		const cards = feed.findAll('.audit__card');
		expect(cards).toHaveLength(2);
		expect(cards[0]?.find('.audit__avatar').text()).toBe('EC');
		expect(cards[0]?.text()).toContain('Eric Cartman');
		expect(cards[0]?.text()).toContain('Success');
		expect(cards[1]?.find('.audit__avatar').text()).toBe('K');
		expect(cards[1]?.text()).toContain('kenny@mccormick.com');

		await cards[1]?.trigger('click');
		await flushPromises();
		expect(page.find('h2').text()).toBe('Log details');
		expect(page.find('[data-block="preamble"]').text()).toContain('attempted to receive rows');
	});
});
