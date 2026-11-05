import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiSkeleton from './UiSkeleton.vue';

describe('UiSkeleton', () => {
	it('announces once from the wrapper', () => {
		const wrapper = mount(UiSkeleton);

		expect(wrapper.attributes('role')).toBe('status');
		expect(wrapper.attributes('aria-label')).toBe('Loading');
	});

	it('accepts a more specific label', () => {
		const wrapper = mount(UiSkeleton, { props: { label: 'Loading websites' } });

		expect(wrapper.attributes('aria-label')).toBe('Loading websites');
	});

	it('hides the shimmer bars from assistive tech', () => {
		// The bars are decorative — the wrapper's label is the announcement. Without this, AT reads a
		// stack of empty elements.
		const bars = mount(UiSkeleton, { props: { lines: 2 } }).findAll('.ui-skeleton__bar');

		expect(bars).toHaveLength(2);
		for (const bar of bars) expect(bar.attributes('aria-hidden')).toBe('true');
	});

	it('renders one bar per line inside a single labelled wrapper', () => {
		// The reason `lines` exists rather than three sibling components: three wrappers would make AT
		// announce "Loading" three times.
		const wrapper = mount(UiSkeleton, { props: { lines: 3 } });

		expect(wrapper.findAll('.ui-skeleton__bar')).toHaveLength(3);
		expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
	});

	it('renders at least one bar for a nonsensical line count', () => {
		expect(mount(UiSkeleton, { props: { lines: 0 } }).findAll('.ui-skeleton__bar')).toHaveLength(1);
		expect(mount(UiSkeleton, { props: { lines: -2 } }).findAll('.ui-skeleton__bar')).toHaveLength(1);
	});

	it('lands shape as a modifier class on the bars', () => {
		const line = mount(UiSkeleton).find('.ui-skeleton__bar');
		const block = mount(UiSkeleton, { props: { shape: 'block' } }).find('.ui-skeleton__bar');

		expect(line.classes()).toContain('ui-skeleton__bar--line');
		expect(block.classes()).toContain('ui-skeleton__bar--block');
	});

	it('passes width and height through as inline styles', () => {
		// The one accepted :style in a primitive — asserting it's wired, not what it paints.
		const bar = mount(UiSkeleton, { props: { width: '40%', height: '1.1rem' } }).find('.ui-skeleton__bar');

		expect(bar.attributes('style')).toContain('width: 40%');
		expect(bar.attributes('style')).toContain('height: 1.1rem');
	});

	it('is a hidden part of a larger placeholder when decorative', () => {
		// A composite placeholder owns the one status region; its bars must not each announce.
		const wrapper = mount(UiSkeleton, { props: { decorative: true } });

		expect(wrapper.attributes('role')).toBeUndefined();
		expect(wrapper.attributes('aria-label')).toBeUndefined();
		expect(wrapper.attributes('aria-hidden')).toBe('true');
	});

	it('lands the control and circle shapes as modifier classes', () => {
		expect(
			mount(UiSkeleton, { props: { shape: 'control' } })
				.find('.ui-skeleton__bar')
				.classes(),
		).toContain('ui-skeleton__bar--control');
		expect(
			mount(UiSkeleton, { props: { shape: 'circle' } })
				.find('.ui-skeleton__bar')
				.classes(),
		).toContain('ui-skeleton__bar--circle');
	});
});
