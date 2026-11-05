import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import PhoneDisplay from './PhoneDisplay.vue';
import { cellText, setupCopy } from './testing';

describe('PhoneDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('formats an international number with its country flag', () => {
		const wrapper = mount(PhoneDisplay, { props: { value: '+14155552671' } });
		const link = wrapper.get('a');
		expect(link.text()).toBe('+1 415 555 2671');
		expect(link.attributes('href')).toBe('tel:+14155552671');
		expect(wrapper.get('.phone-display__flag').attributes('title')).toBe('United States');
	});

	it('shows an unparseable number as is', () => {
		const wrapper = mount(PhoneDisplay, { props: { value: '12345' } });
		expect(wrapper.get('a').text()).toBe('12345');
		expect(wrapper.find('.phone-display__flag').exists()).toBe(false);
	});

	it('shows a dash for null', () => {
		const wrapper = mount(PhoneDisplay, { props: { value: null } });
		expect(cellText(wrapper)).toBe('—');
		expect(wrapper.find('a').exists()).toBe(false);
	});

	it('copies the raw value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(PhoneDisplay, { props: { value: '+14155552671' }, attachTo }));
		expect(result).toEqual({ copied: ['+14155552671'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
