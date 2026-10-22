import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { vTooltip } from '@/components/ui';
import DashboardsSidebar from './DashboardsSidebar.vue';

const uiSettings = vi.hoisted(() => ({ getUiSettings: vi.fn(), updateConnectionSetting: vi.fn() }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));

async function mountSidebar(activeTab: 'dashboards' | 'queries' = 'dashboards') {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
	});
	await router.push('/elsewhere');
	const wrapper = mount(DashboardsSidebar, {
		props: { connectionId: 'conn-1', activeTab },
		global: { plugins: [router], directives: { tooltip: vTooltip } },
	});
	await flushPromises();
	return wrapper;
}

describe('DashboardsSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		uiSettings.getUiSettings.mockResolvedValue(null);
	});

	it('links to the dashboards and panels pages and marks the active one', async () => {
		const wrapper = await mountSidebar('queries');
		const links = wrapper.findAll('nav a');

		expect(links.map((link) => link.attributes('href'))).toEqual(['/dashboards/conn-1', '/panels/conn-1']);
		expect(links[1]?.classes()).toContain('ui-list-item__content--active');
		expect(links[0]?.classes()).not.toContain('ui-list-item__content--active');
	});

	it('restores the collapsed state of the connection', async () => {
		uiSettings.getUiSettings.mockResolvedValue({
			globalSettings: {},
			connections: { 'conn-1': { shownTableTitles: false, tables: {}, dashboardsSidebarCollapsed: true } },
		});
		const wrapper = await mountSidebar();

		expect(wrapper.classes()).toContain('dashboards-sidebar--collapsed');
	});

	it('saves the collapsed state when toggled', async () => {
		const wrapper = await mountSidebar();

		await wrapper.get('[data-testid="dashboards-sidebar-toggle"]').trigger('click');
		expect(wrapper.classes()).toContain('dashboards-sidebar--collapsed');
		expect(uiSettings.updateConnectionSetting).toHaveBeenCalledWith('conn-1', 'dashboardsSidebarCollapsed', true);

		await wrapper.get('[data-testid="dashboards-sidebar-toggle"]').trigger('click');
		expect(uiSettings.updateConnectionSetting).toHaveBeenLastCalledWith('conn-1', 'dashboardsSidebarCollapsed', false);
	});
});
