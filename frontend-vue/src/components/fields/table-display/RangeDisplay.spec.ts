import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RangeDisplay from './RangeDisplay.vue';
import { widget } from './testing';

describe('RangeDisplay', () => {
	it('shows the value over the default max of 100', () => {
		const wrapper = mount(RangeDisplay, { props: { value: 50 } });
		expect(wrapper.get('.range-display__label').text()).toBe('50 / 100');
		expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50');
	});

	it('reads min / max from the widget params', () => {
		const wrapper = mount(RangeDisplay, {
			props: { value: 75, widgetStructure: widget({ min: 50, max: 150, step: 5 }) },
		});
		expect(wrapper.get('.range-display__label').text()).toBe('75 / 150');
		// (75 - 50) / (150 - 50) = 25%
		expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
	});

	it('clamps out-of-range values and treats null as 0', () => {
		expect(
			mount(RangeDisplay, { props: { value: 500 } })
				.get('[role="progressbar"]')
				.attributes('aria-valuenow'),
		).toBe('100');
		const empty = mount(RangeDisplay, { props: { value: null } });
		expect(empty.get('.range-display__label').text()).toBe('0 / 100');
		expect(empty.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0');
	});
});
