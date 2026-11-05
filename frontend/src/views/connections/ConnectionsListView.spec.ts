import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { CompanyMemberRole } from '@/models/company';
import type { User } from '@/models/user';
import type { ConnectionListItem } from '@/stores/connections';
import ConnectionsListView from './ConnectionsListView.vue';
import { mountConnectionView } from './connectionsTestUtils';

const connections = vi.hoisted(() => ({ ownConnections: null as ConnectionListItem[] | null }));
const user = vi.hoisted(() => ({ currentUser: null as User | null }));
const company = vi.hoisted(() => ({ fetchCompanyName: vi.fn(), fetchCompanyMembers: vi.fn() }));
const uiSettings = vi.hoisted(() => ({ isDarkMode: false, getUiSettings: vi.fn(), updateGlobalSetting: vi.fn() }));
vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => reactive(connections) }));
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/stores/company', () => ({ useCompanyStore: () => company }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));

const admin = { id: 'u1', role: CompanyMemberRole.CAO, company: { id: 'company-1' } } as User;

const mountPage = () => mountConnectionView(ConnectionsListView, '/connections-list');

describe('ConnectionsListView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connections.ownConnections = null;
		user.currentUser = admin;
		company.fetchCompanyName.mockResolvedValue({ name: 'Such.Ukr.Lit' });
		company.fetchCompanyMembers.mockResolvedValue([]);
		uiSettings.getUiSettings.mockResolvedValue(null);
	});

	it('sets the page title and shows the company name with an edit link for the owner', async () => {
		const { wrapper } = await mountPage();

		expect(document.title).toBe('Connections | Rocketadmin');
		expect(company.fetchCompanyName).toHaveBeenCalledWith('company-1');
		expect(wrapper.find('[data-testid="company-name"]').text()).toBe('Such.Ukr.Lit');
		expect(wrapper.find('a[aria-label="Edit company"]').attributes('href')).toBe('/company');
		wrapper.unmount();
	});

	it('hides the company edit link from other roles', async () => {
		user.currentUser = { ...admin, role: CompanyMemberRole.SystemAdmin };
		const { wrapper } = await mountPage();

		expect(wrapper.find('a[aria-label="Edit company"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('shows the skeleton until the connections have loaded', async () => {
		const { wrapper } = await mountPage();
		expect(wrapper.find('[aria-label="Loading connections"]').exists()).toBe(true);

		reactive(connections).ownConnections = [];
		await flushPromises();

		expect(wrapper.find('[aria-label="Loading connections"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('Connect your own');
		wrapper.unmount();
	});

	it('loads the company name once the user is known', async () => {
		user.currentUser = null;
		const { wrapper } = await mountPage();
		expect(company.fetchCompanyName).not.toHaveBeenCalled();

		reactive(user).currentUser = admin;
		await flushPromises();

		expect(wrapper.find('[data-testid="company-name"]').text()).toBe('Such.Ukr.Lit');
		wrapper.unmount();
	});
});
