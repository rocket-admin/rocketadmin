import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import BooleanRecordView from './BooleanRecordView.vue';

describe('BooleanRecordView', () => {
	it('renders a check for true in the positive tone', () => {
		const wrapper = mount(BooleanRecordView, { props: { value: true } });
		expect(wrapper.text()).toBe('check');
		expect(wrapper.attributes('aria-label')).toBe('Yes');
		expect(wrapper.classes()).toContain('boolean-record-view--true');
	});

	it('renders a cross for false in the negative tone', () => {
		const wrapper = mount(BooleanRecordView, { props: { value: false } });
		expect(wrapper.text()).toBe('close');
		expect(wrapper.classes()).toContain('boolean-record-view--false');
	});

	it('swaps the tones with invertColors', () => {
		const widgetStructure = mockWidgetStructure({ invertColors: true });
		expect(mount(BooleanRecordView, { props: { value: true, widgetStructure } }).classes()).toContain(
			'boolean-record-view--false',
		);
		expect(mount(BooleanRecordView, { props: { value: false, widgetStructure } }).classes()).toContain(
			'boolean-record-view--true',
		);
	});

	it('renders a dash for null', () => {
		expect(mount(BooleanRecordView, { props: { value: null } }).text()).toBe('—');
	});
});

describe('BooleanRecordView without a value', () => {
	it('renders the dash, not a cross', () => {
		const wrapper = mount(BooleanRecordView);
		expect(wrapper.find('.boolean-record-view').exists()).toBe(false);
	});
});
