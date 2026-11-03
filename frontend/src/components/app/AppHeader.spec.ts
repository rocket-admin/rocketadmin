import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppHeader from './AppHeader.vue';
import AppNavDrawer from './AppNavDrawer.vue';

const connections = reactive({
	connectionID: null as string | null,
	currentConnection: { isTestConnection: false },
	currentConnectionName: 'Production',
	ownConnectionsList: [] as Array<{ connection: { id: string; isTestConnection: boolean }; displayTitle: string }>,
	visibleTabs: ['dashboard', 'audit'] as string[],
});
const user = reactive({
	currentUser: { email: 'ada@example.com', isActive: true } as { email: string; isActive: boolean } | null,
});

vi.mock('@/stores/connections', () => ({ useConnectionsStore: () => connections }));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));
vi.mock('@/environment', () => ({ environment: { saas: false } }));

function makeRouter() {
	const blank = { template: '<div />' };
	return createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: blank }] });
}

async function mountHeader(userLoggedIn: boolean | null = true) {
	const router = makeRouter();
	router.push('/connections-list');
	await router.isReady();
	const wrapper = mount(AppHeader, { props: { userLoggedIn }, global: { plugins: [router] }, attachTo: document.body });
	await flushPromises();
	return wrapper;
}

describe('AppHeader', () => {
	beforeEach(() => {
		connections.connectionID = null;
		connections.ownConnectionsList = [];
		user.currentUser = { email: 'ada@example.com', isActive: true };
	});

	it('links the logo to rocketadmin.com when signed out, with no account menu', async () => {
		const wrapper = await mountHeader(false);

		expect(wrapper.find('a.app-header__logo').attributes('href')).toBe('https://rocketadmin.com/');
		expect(wrapper.find('[data-testid="account-menu-anchor-header-button"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('shows the connection tabs for an open connection', async () => {
		connections.connectionID = 'c1';
		connections.visibleTabs = ['dashboard', 'audit', 'edit-db'];
		const wrapper = await mountHeader();

		const tabs = wrapper.findAll('.app-header__tab');
		expect(tabs.map((tab) => tab.attributes('href'))).toEqual(['/dashboard/c1', '/audit/c1', '/edit-db/c1']);
		expect(tabs[0]?.text()).toBe('Tables');
		expect(tabs[2]?.attributes('title')).toBe('Database credentials');
		wrapper.unmount();
	});

	it('disables the connection switcher when the open connection is the only one', async () => {
		connections.connectionID = 'c1';
		connections.ownConnectionsList = [
			{ connection: { id: 'c1', isTestConnection: false }, displayTitle: 'Production' },
		];
		const wrapper = await mountHeader();

		const switcher = wrapper.find('.app-header__switcher');
		expect(switcher.text()).toContain('Production');
		expect(switcher.attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});

	it('flags an unverified email on the account button', async () => {
		user.currentUser = { email: 'ada@example.com', isActive: false };
		const wrapper = await mountHeader();

		expect(wrapper.find('[data-testid="account-menu-anchor-header-button"]').attributes('aria-label')).toContain(
			'email not verified',
		);
		wrapper.unmount();
	});
});

describe('AppNavDrawer', () => {
	beforeEach(() => {
		(HTMLDialogElement.prototype as unknown as { showModal: () => void }).showModal = function (
			this: HTMLDialogElement,
		) {
			this.open = true;
		};
	});

	it('closes and emits log-out when Log out is chosen', async () => {
		const router = makeRouter();
		router.push('/');
		await router.isReady();
		const wrapper = mount(AppNavDrawer, {
			props: { open: true },
			global: { plugins: [router] },
			attachTo: document.body,
		});
		await flushPromises();

		await wrapper.find('[data-testid="logout-button-account-menu"]').trigger('click');

		expect(wrapper.emitted('update:open')).toEqual([[false]]);
		expect(wrapper.emitted('log-out')).toHaveLength(1);
		wrapper.unmount();
	});

	it('hides Zapier outside SaaS', async () => {
		const router = makeRouter();
		router.push('/');
		await router.isReady();
		const wrapper = mount(AppNavDrawer, {
			props: { open: true },
			global: { plugins: [router] },
			attachTo: document.body,
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="zapier-link-account-menu"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="secrets-link-account-menu"]').exists()).toBe(true);
		wrapper.unmount();
	});
});
