import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiSpinner from './UiSpinner.vue';

describe('UiSpinner', () => {
	it('is decorative when unlabelled', () => {
		// The in-button case: the button already carries aria-busy and its own label, so a second
		// announcement would be noise.
		const wrapper = mount(UiSpinner);

		expect(wrapper.attributes('aria-hidden')).toBe('true');
		expect(wrapper.attributes('role')).toBeUndefined();
	});

	it('announces when labelled', () => {
		const wrapper = mount(UiSpinner, { props: { label: 'Loading websites' } });

		expect(wrapper.attributes('role')).toBe('status');
		expect(wrapper.attributes('aria-hidden')).toBeUndefined();
		expect(wrapper.text()).toBe('Loading websites');
	});

	it('lands size as a modifier class', () => {
		expect(mount(UiSpinner, { props: { size: 'sm' } }).classes()).toContain('ui-spinner--size-sm');
		expect(mount(UiSpinner).classes()).toContain('ui-spinner--size-md');
		expect(mount(UiSpinner, { props: { size: 'lg' } }).classes()).toContain('ui-spinner--size-lg');
	});
});
