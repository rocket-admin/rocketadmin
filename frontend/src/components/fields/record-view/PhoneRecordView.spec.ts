import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PhoneRecordView from './PhoneRecordView.vue';

describe('PhoneRecordView', () => {
	it('formats a valid number internationally with its country flag', () => {
		const wrapper = mount(PhoneRecordView, { props: { value: '+12025551234' } });
		const link = wrapper.find('a');
		expect(link.attributes('href')).toBe('tel:+12025551234');
		expect(link.text()).toBe('+1 202 555 1234');
		expect(wrapper.find('.phone-record-view__flag').attributes('title')).toBe('United States');
	});

	it('shows an unparseable number as stored', () => {
		const wrapper = mount(PhoneRecordView, { props: { value: 'not-a-phone' } });
		expect(wrapper.find('a').text()).toBe('not-a-phone');
		expect(wrapper.find('.phone-record-view__flag').exists()).toBe(false);
	});

	it('renders nothing for null', () => {
		expect(
			mount(PhoneRecordView, { props: { value: null } })
				.find('a')
				.exists(),
		).toBe(false);
	});
});
