import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import CountryDisplay from './CountryDisplay.vue';
import { cellText, setupCopy, widget } from './testing';

describe('CountryDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows the flag and name for a code', () => {
		const wrapper = mount(CountryDisplay, { props: { value: 'US' } });
		expect(wrapper.get('.country-display__flag').text()).toBe('🇺🇸');
		expect(cellText(wrapper)).toContain('United States');
	});

	it('falls back to the raw value for an unknown code', () => {
		expect(cellText(mount(CountryDisplay, { props: { value: 'XX' } }))).toContain('XX');
	});

	it('shows a dash for null', () => {
		const wrapper = mount(CountryDisplay, { props: { value: null } });
		expect(cellText(wrapper)).toBe('—');
		expect(wrapper.find('.country-display__flag').exists()).toBe(false);
	});

	it('hides the flag with show_flag: false', () => {
		const wrapper = mount(CountryDisplay, { props: { value: 'US', widgetStructure: widget({ show_flag: false }) } });
		expect(wrapper.find('.country-display__flag').exists()).toBe(false);
	});

	it('copies the country name', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(CountryDisplay, { props: { value: 'FR' }, attachTo }));
		expect(result).toEqual({ copied: ['France'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
