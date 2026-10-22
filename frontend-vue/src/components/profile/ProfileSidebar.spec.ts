import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { environment } from '@/environment';
import ProfileSidebar from './ProfileSidebar.vue';

const uiSettings = vi.hoisted(() => ({ getUiSettings: vi.fn(), updateGlobalSetting: vi.fn() }));
vi.mock('@/stores/ui-settings', () => ({ useUiSettingsStore: () => uiSettings }));

async function mountSidebar(activeTab: 'account' | 'company' | 'api' | 'secrets' | 'zapier' = 'account') {
	const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: {} }] });
	router.push('/');
	await router.isReady();
	const wrapper = mount(ProfileSidebar, { props: { activeTab }, global: { plugins: [router] } });
	await flushPromises();
	return wrapper;
}

describe('ProfileSidebar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		environment.saas = false;
		uiSettings.getUiSettings.mockResolvedValue(null);
	});

	it('links the account pages, Zapier only on SaaS', async () => {
		let wrapper = await mountSidebar();
		expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([
			'/user-settings',
			'/company',
			'/secrets',
			'/api-keys',
		]);
		expect(wrapper.text()).toContain('General');
		wrapper.unmount();

		environment.saas = true;
		wrapper = await mountSidebar();
		expect(wrapper.findAll('a').at(-1)?.attributes('href')).toBe('/zapier');
		expect(wrapper.findAll('a')).toHaveLength(5);
		wrapper.unmount();
	});

	it('highlights the active tab', async () => {
		const wrapper = await mountSidebar('secrets');
		const active = wrapper.findAll('.profile-sidebar__item--active');
		expect(active).toHaveLength(1);
		expect(active[0]?.text()).toContain('Secrets');
		wrapper.unmount();
	});

	it('restores the collapsed state and stores it when toggled', async () => {
		uiSettings.getUiSettings.mockResolvedValue({ globalSettings: { profileSidebarCollapsed: true }, connections: {} });
		const wrapper = await mountSidebar();

		expect(wrapper.find('aside').classes()).toContain('profile-sidebar--collapsed');
		expect(wrapper.text()).not.toContain('General');
		expect(wrapper.find('a[href="/company"] [role="img"]').attributes('aria-label')).toBe('Company');

		await wrapper.find('button[aria-label="Expand"]').trigger('click');
		expect(uiSettings.updateGlobalSetting).toHaveBeenCalledWith('profileSidebarCollapsed', false);
		expect(wrapper.text()).toContain('General');
		wrapper.unmount();
	});
});
