import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiChip from './UiChip.vue';

describe('UiChip', () => {
	it('renders its slot content verbatim', () => {
		// Verbatim matters: `text-transform: capitalize` was dropped on purpose, so a status string
		// arrives at the DOM exactly as the caller passed it.
		const wrapper = mount(UiChip, { slots: { default: 'generating' } });

		expect(wrapper.text()).toBe('generating');
	});

	it('lands tone and size as modifier classes', () => {
		const wrapper = mount(UiChip, { props: { tone: 'warning', size: 'md' } });

		expect(wrapper.classes()).toContain('ui-chip--warning');
		expect(wrapper.classes()).toContain('ui-chip--size-md');
	});

	it('defaults to the neutral sm chip', () => {
		const wrapper = mount(UiChip);

		expect(wrapper.classes()).toContain('ui-chip--neutral');
		expect(wrapper.classes()).toContain('ui-chip--size-sm');
	});

	it('is not interactive', () => {
		// A chip labels something else; it is not an affordance. Guards against a future PR quietly
		// adding a role or tabindex instead of building a proper removable-chip component.
		const wrapper = mount(UiChip, { slots: { default: 'draft' } });

		expect(wrapper.element.tagName).toBe('SPAN');
		expect(wrapper.attributes('role')).toBeUndefined();
		expect(wrapper.attributes('tabindex')).toBeUndefined();
	});
});
