import { describe, expect, it } from 'vitest';
import { mountAuthView } from './authTestUtils';
import UserDeletedView from './UserDeletedView.vue';

describe('UserDeletedView', () => {
	it('confirms the deletion and links to the home page', async () => {
		const { wrapper } = await mountAuthView(UserDeletedView, '/deleted');

		expect(wrapper.text()).toContain('Your account has been deleted successfully.');
		expect(wrapper.find('.app-banner__box--success').exists()).toBe(true);
		const link = wrapper.find('a');
		expect(link.text()).toBe('Visit home page');
		expect(link.attributes('href')).toBe('https://rocketadmin.com/');
		wrapper.unmount();
	});
});
