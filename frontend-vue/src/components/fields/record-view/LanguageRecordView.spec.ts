import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import LanguageRecordView from './LanguageRecordView.vue';

describe('LanguageRecordView', () => {
	it('shows the language name from its code, case-insensitively', () => {
		expect(mount(LanguageRecordView, { props: { value: 'en' } }).text()).toContain('English');
		expect(mount(LanguageRecordView, { props: { value: 'EN' } }).text()).toContain('English');
	});

	it('shows the flag unless show_flag is false', () => {
		expect(
			mount(LanguageRecordView, { props: { value: 'en' } })
				.find('.language-record-view__flag')
				.exists(),
		).toBe(true);
		const hidden = mount(LanguageRecordView, {
			props: { value: 'en', widgetStructure: mockWidgetStructure({ show_flag: false }) },
		});
		expect(hidden.find('.language-record-view__flag').exists()).toBe(false);
	});

	it('shows an unknown code as stored', () => {
		expect(mount(LanguageRecordView, { props: { value: 'xx-klingon' } }).text()).toBe('xx-klingon');
	});

	it('renders a dash for null', () => {
		expect(mount(LanguageRecordView, { props: { value: null } }).text()).toBe('—');
	});
});
