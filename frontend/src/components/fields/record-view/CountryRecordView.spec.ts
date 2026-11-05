import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { getCountryFlag } from '@/consts/countries';
import { mockWidgetStructure } from '../stories.mocks';
import CountryRecordView from './CountryRecordView.vue';

describe('CountryRecordView', () => {
	it('shows the country name and flag', () => {
		const wrapper = mount(CountryRecordView, { props: { value: 'US' } });
		expect(wrapper.text()).toContain('United States');
		expect(wrapper.find('.country-record-view__flag').text()).toBe(getCountryFlag('US'));
	});

	it('hides the flag with show_flag: false', () => {
		const wrapper = mount(CountryRecordView, {
			props: { value: 'US', widgetStructure: mockWidgetStructure({ show_flag: false }) },
		});
		expect(wrapper.find('.country-record-view__flag').exists()).toBe(false);
	});

	it('shows an unknown code as stored', () => {
		expect(mount(CountryRecordView, { props: { value: 'Atlantis' } }).text()).toBe('Atlantis');
	});

	it('renders a dash for null', () => {
		expect(mount(CountryRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
