import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import NumberDisplay from './NumberDisplay.vue';
import { setupCopy, widget } from './testing';

const render = (value: number | string | null, params: Record<string, unknown> = {}) =>
	mount(NumberDisplay, { props: { value, widgetStructure: widget(params) } });

const arrow = (value: number, params: Record<string, unknown>) =>
	render(value, params).find('.number-display__value .ui-icon');

describe('NumberDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('displays the value right-aligned, or a dash', () => {
		const wrapper = render(42);
		expect(wrapper.get('.number-display__value').text()).toBe('42');
		expect(wrapper.classes()).toContain('table-display-cell--align-end');
		expect(render(null).get('.number-display__value').text()).toBe('—');
		expect(render('').get('.number-display__value').text()).toBe('—');
	});

	it('converts to the best unit', () => {
		expect(render(1500, { unit: 'm' }).get('.number-display__value').text()).toBe('1.5 km');
	});

	it('falls back to the raw value for an unknown unit', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(render(5, { unit: 'nope' }).get('.number-display__value').text()).toBe('5');
	});

	it('marks a value above or below the thresholds', () => {
		expect(arrow(150, { threshold_min: 0, threshold_max: 100 }).text()).toBe('north');
		expect(arrow(-5, { threshold_min: 0, threshold_max: 100 }).text()).toBe('south');
		expect(arrow(50, { threshold_min: 0, threshold_max: 100 }).exists()).toBe(false);
	});

	it('handles one-sided thresholds like Angular', () => {
		expect(arrow(5, { threshold_min: 10, threshold_max: null }).text()).toBe('south');
		expect(arrow(500, { threshold_min: null, threshold_max: 100 }).text()).toBe('north');
	});

	it('copies the raw value', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(
			mount(NumberDisplay, { props: { value: 1500, widgetStructure: widget({ unit: 'm' }) }, attachTo }),
		);
		expect(result).toEqual({ copied: ['1500'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
