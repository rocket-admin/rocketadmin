import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { useNotificationsStore } from '@/stores/notifications';
import AppSnackbars from './AppSnackbars.vue';

describe('AppSnackbars', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('announces snackbars politely and dismisses on the action', async () => {
		const wrapper = mount(AppSnackbars);
		const notifications = useNotificationsStore();

		notifications.showErrorSnackbar('Could not save');
		await nextTick();

		const region = wrapper.find('.app-snackbars--bottom');
		expect(region.attributes('role')).toBe('status');
		expect(region.text()).toContain('Could not save');

		await region.find('button').trigger('click');
		expect(notifications.snackbars).toEqual([]);
	});

	it('puts top-positioned success snackbars at the top, without an action', async () => {
		const wrapper = mount(AppSnackbars);
		useNotificationsStore().showSuccessSnackbar('Copied', 'top');
		await nextTick();

		expect(wrapper.find('.app-snackbars--top').text()).toBe('Copied');
		expect(wrapper.find('.app-snackbars--top button').exists()).toBe(false);
	});
});
