import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import RangeRecordView from './RangeRecordView.vue';

const mountRange = (value: number | string | null, params: Record<string, unknown> = {}) =>
	mount(RangeRecordView, { props: { fieldKey: 'score', value, widgetStructure: mockWidgetStructure(params) } });

const progress = (wrapper: ReturnType<typeof mountRange>) =>
	Number(wrapper.find('[role="progressbar"]').attributes('aria-valuenow'));

describe('RangeRecordView', () => {
	it('shows the value against the default max', () => {
		const wrapper = mountRange(50);
		expect(wrapper.find('.range-record-view__label').text()).toBe('50 / 100');
		expect(progress(wrapper)).toBe(50);
	});

	it('uses min/max from widget params', () => {
		const wrapper = mountRange(100, { min: 0, max: 200 });
		expect(wrapper.find('.range-record-view__label').text()).toBe('100 / 200');
		expect(progress(wrapper)).toBe(50);
	});

	it('positions the value relative to min', () => {
		expect(progress(mountRange(15, { min: 10, max: 20 }))).toBe(50);
	});

	it('clamps the progress', () => {
		expect(progress(mountRange(150))).toBe(100);
		expect(progress(mountRange(-5))).toBe(0);
	});

	it('treats a non-numeric value as 0', () => {
		expect(mountRange('[1, 100]').find('.range-record-view__label').text()).toBe('0 / 100');
	});

	it('names the meter after the field', () => {
		expect(mountRange(1).find('[role="progressbar"]').attributes('aria-label')).toBe('score');
	});
});
