import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mountAuthView } from '@/views/auth/authTestUtils';
import ZapierView from './ZapierView.vue';

const user = vi.hoisted(() => ({ currentUser: null as { email: string } | null, fetchUser: vi.fn() }));
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive(user) }));
vi.mock('@/stores/ui-settings', () => ({
	useUiSettingsStore: () => ({ getUiSettings: () => Promise.resolve(null), updateGlobalSetting: vi.fn() }),
}));

const CDN = 'https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements';

describe('ZapierView', () => {
	beforeEach(() => {
		user.currentUser = { email: 'user@test.com' };
	});

	afterEach(() => {
		for (const node of document.head.querySelectorAll(`[src^="${CDN}"], [href^="${CDN}"]`)) node.remove();
	});

	it('loads the Zapier elements once and embeds the workflow for the user', async () => {
		const { wrapper } = await mountAuthView(ZapierView, '/zapier');
		wrapper.unmount();
		const again = await mountAuthView(ZapierView, '/zapier');

		expect(document.head.querySelectorAll(`script[src="${CDN}/zapier-elements.esm.js"]`)).toHaveLength(1);
		expect(document.head.querySelectorAll(`link[href="${CDN}/zapier-elements.css"]`)).toHaveLength(1);

		const workflow = again.wrapper.find('zapier-workflow').element as HTMLElement & Record<string, unknown>;
		expect(workflow.signUpEmail).toBe('user@test.com');
		expect(workflow.clientId).toBe('4MFV3OrjI8e8JkZPySqbFVbKtZUz0sV0H3XJnb6w');
		expect(workflow.zapCreateFromScratchDisplay).toBe('hide');
		expect(again.wrapper.find('a[href="https://docs.rocketadmin.com/Integrations/Zapier"]').text()).toContain('Docs');
		again.wrapper.unmount();
	});

	it('waits for the user before embedding the workflow', async () => {
		user.currentUser = null;
		user.fetchUser.mockReturnValue(new Promise(() => {}));
		const { wrapper } = await mountAuthView(ZapierView, '/zapier');

		expect(user.fetchUser).toHaveBeenCalled();
		expect(wrapper.find('zapier-workflow').exists()).toBe(false);
		wrapper.unmount();
	});
});
