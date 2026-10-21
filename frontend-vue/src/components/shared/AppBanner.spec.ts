import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { AlertType } from '@/models/alert';
import AppBanner from './AppBanner.vue';

describe('AppBanner', () => {
	it('renders its content in the card', () => {
		const wrapper = mount(AppBanner, { slots: { default: '<p>Your account has been deleted successfully.</p>' } });

		expect(wrapper.get('.app-banner__box').text()).toBe('Your account has been deleted successfully.');
	});

	it('lands the type as a modifier, neutral when omitted', () => {
		expect(
			mount(AppBanner, { props: { type: AlertType.Error } })
				.get('.app-banner__box')
				.classes(),
		).toContain('app-banner__box--error');
		expect(mount(AppBanner).get('.app-banner__box').classes()).toContain('app-banner__box--neutral');
	});

	it('renders the actions row only when given', () => {
		expect(mount(AppBanner).find('.app-banner__actions').exists()).toBe(false);

		const wrapper = mount(AppBanner, { slots: { actions: '<button type="button">Report a bug</button>' } });
		expect(wrapper.get('.app-banner__actions').text()).toBe('Report a bug');
	});
});
