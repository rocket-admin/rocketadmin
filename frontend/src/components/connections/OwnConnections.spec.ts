import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { CompanyMemberRole } from '@/models/company';
import { type Connection, ConnectionType, DBtype } from '@/models/connection';
import { AccessLevel, type User } from '@/models/user';
import type { ConnectionListItem } from '@/stores/connections';
import OwnConnections from './OwnConnections.vue';

const uiSettings = vi.hoisted(() => ({
	isDarkMode: false,
	getUiSettings: vi.fn(),
	updateGlobalSetting: vi.fn(),
}));
const company = vi.hoisted(() => ({ fetchCompanyMembers: vi.fn() }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/composables/useAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

const admin = { id: 'u1', role: CompanyMemberRole.CAO, company: { id: 'company-1' } } as User;
const member = { ...admin, role: CompanyMemberRole.Member } as User;

function item(id: string, type = DBtype.Postgres, accessLevel = AccessLevel.Edit): ConnectionListItem {
	return {
		connection: { id, type, title: `Connection ${id}`, connectionType: ConnectionType.Direct } as Connection,
		accessLevel,
		displayTitle: `Connection ${id}`,
	};
}

const five = ['1', '2', '3', '4', '5'].map((id) => item(id));

async function mountList(props: {
	connections: ConnectionListItem[] | null;
	currentUser?: User | null;
	companyId?: string | null;
}): Promise<VueWrapper> {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
	const wrapper = mount(OwnConnections, {
		props: { currentUser: admin, companyId: 'company-1', ...props },
		global: { plugins: [router] },
	});
	await flushPromises();
	return wrapper;
}

describe('OwnConnections', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		uiSettings.getUiSettings.mockResolvedValue({ globalSettings: { connectionsListCollapsed: true } });
		company.fetchCompanyMembers.mockResolvedValue([]);
	});

	it('offers every database type when there are no connections', async () => {
		const wrapper = await mountList({ connections: [] });

		expect(wrapper.find('h1').text()).toBe('Add your first connection');
		const mysql = wrapper.find('[data-testid="mysql-test-connection-list-item"]');
		expect(mysql.attributes('href')).toBe('/connect-db?type=mysql');
		expect(mysql.text()).toContain('MySQL');
		expect(mysql.text()).toContain('(MariaDB)');
		expect(wrapper.findAll('.own-connections__db-card')).toHaveLength(10);
	});

	it('does not invite a plain member to add the first connection', async () => {
		const wrapper = await mountList({ connections: [], currentUser: member });

		expect(wrapper.find('h1').exists()).toBe(false);
	});

	it('tells an invited member to ask for access when the company has other members', async () => {
		company.fetchCompanyMembers.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
		const wrapper = await mountList({ connections: [], currentUser: member });

		expect(company.fetchCompanyMembers).toHaveBeenCalledWith('company-1');
		expect(wrapper.text()).toContain("Invited to a company but don't see your admin panel?");
	});

	it('shows three connections when the list is collapsed, and all of them on "Show all"', async () => {
		const wrapper = await mountList({ connections: five });

		expect(wrapper.findAll('.own-connections__item')).toHaveLength(3);
		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Show all')
			?.trigger('click');

		expect(wrapper.findAll('.own-connections__item')).toHaveLength(5);
		expect(uiSettings.updateGlobalSetting).toHaveBeenCalledWith('connectionsListCollapsed', false);

		await wrapper
			.findAll('button')
			.find((button) => button.text() === 'Show less')
			?.trigger('click');
		expect(wrapper.findAll('.own-connections__item')).toHaveLength(3);
		expect(uiSettings.updateGlobalSetting).toHaveBeenCalledWith('connectionsListCollapsed', true);
	});

	it('shows every connection when the list was left expanded', async () => {
		uiSettings.getUiSettings.mockResolvedValue({ globalSettings: { connectionsListCollapsed: false } });
		const wrapper = await mountList({ connections: five });

		expect(wrapper.findAll('.own-connections__item')).toHaveLength(5);
	});

	it('links each card to its dashboard, and editors of SQL databases to the schema editor', async () => {
		const wrapper = await mountList({
			connections: [item('1'), item('2', DBtype.Mongo), item('3', DBtype.MySQL, AccessLevel.Readonly)],
		});

		const cards = wrapper.findAll('.own-connections__card');
		expect(cards[0]?.attributes('href')).toBe('/dashboard/1');
		expect(cards[0]?.text()).toContain('Connection 1');
		expect(cards[0]?.text()).toContain('PostgreSQL');
		const schemaLinks = wrapper.findAll('.own-connections__schema');
		expect(schemaLinks).toHaveLength(1);
		expect(schemaLinks[0]?.attributes('href')).toBe('/edit-database-schema/1');
	});

	it('shows the "Add database" button to admins only', async () => {
		const asAdmin = await mountList({ connections: five });
		expect(asAdmin.find('[data-testid="add-connection-button"]').attributes('href')).toBe('/connect-db');

		const asMember = await mountList({ connections: five, currentUser: member });
		expect(asMember.find('[data-testid="add-connection-button"]').exists()).toBe(false);
	});
});
