import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import NumberRecordView from './NumberRecordView.vue';

const mountNumber = (value: number | string | null, params: Record<string, unknown> = {}) =>
	mount(NumberRecordView, { props: { value, widgetStructure: mockWidgetStructure(params) } });

describe('NumberRecordView', () => {
	it('renders a dash for null and empty', () => {
		expect(mountNumber(null).text()).toBe('—');
		expect(mountNumber('').text()).toBe('—');
	});

	it('renders the number when no unit is set', () => {
		expect(mountNumber(42).text()).toBe('42');
		expect(mountNumber(0).text()).toBe('0');
	});

	it('converts to the best unit', () => {
		expect(mountNumber(1500, { unit: 'm' }).text()).toBe('1.5 km');
	});

	it('falls back to the raw value for an unknown unit', () => {
		expect(mountNumber(7, { unit: 'bogus' }).text()).toBe('7');
	});

	it('has no arrow without thresholds', () => {
		const wrapper = mountNumber('50');
		expect(wrapper.find('[role="img"]').exists()).toBe(false);
		expect(wrapper.classes()).not.toContain('number-record-view--out-of-threshold');
	});

	it('points north below threshold_min', () => {
		const wrapper = mountNumber('5', { threshold_min: 10 });
		expect(wrapper.find('[role="img"]').text()).toBe('north');
		expect(wrapper.classes()).toContain('number-record-view--out-of-threshold');
	});

	it('points south above threshold_max', () => {
		expect(mountNumber('150', { threshold_max: 100 }).find('[role="img"]').text()).toBe('south');
	});
});
