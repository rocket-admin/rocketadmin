import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiDivider from './UiDivider.vue';

describe('UiDivider', () => {
	it('is a native hr, horizontal by default', () => {
		const wrapper = mount(UiDivider);

		expect(wrapper.element.tagName).toBe('HR');
		expect(wrapper.attributes('aria-orientation')).toBeUndefined();
	});

	it('declares a vertical orientation', () => {
		const wrapper = mount(UiDivider, { props: { vertical: true } });

		expect(wrapper.attributes('aria-orientation')).toBe('vertical');
		expect(wrapper.classes()).toContain('ui-divider--vertical');
	});
});
