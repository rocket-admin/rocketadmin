import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiProgressBar from './UiProgressBar.vue';

/** The fill's inline width is the rendered percentage — the one CSS value worth asserting here,
 *  because it *is* the arithmetic under test rather than an appearance choice. */
function fillWidth(wrapper: ReturnType<typeof mount>): string | undefined {
	return wrapper.find('.ui-progress-bar__fill').attributes('style');
}

describe('UiProgressBar', () => {
	it('exposes itself to assistive tech', () => {
		// The bar it replaces has none of this — a screenreader user gets no sense of the budget.
		const wrapper = mount(UiProgressBar, {
			props: { value: 7, max: 10, label: 'Websites generated today' },
		});

		expect(wrapper.attributes('role')).toBe('progressbar');
		expect(wrapper.attributes('aria-label')).toBe('Websites generated today');
		expect(wrapper.attributes('aria-valuemin')).toBe('0');
		expect(wrapper.attributes('aria-valuemax')).toBe('10');
	});

	it('reports aria-valuenow in the raw unit, not as a percentage', () => {
		// A screenreader reads "7 of 10". Passing 70 against a max of 10 would be nonsense.
		const wrapper = mount(UiProgressBar, { props: { value: 7, max: 10, label: 'Usage' } });

		expect(wrapper.attributes('aria-valuenow')).toBe('7');
		expect(fillWidth(wrapper)).toContain('width: 70%');
	});

	it('clamps a value above max to a full bar', () => {
		const wrapper = mount(UiProgressBar, { props: { value: 150, max: 100, label: 'Usage' } });

		expect(fillWidth(wrapper)).toContain('width: 100%');
		expect(wrapper.attributes('aria-valuenow')).toBe('100');
	});

	it('clamps a negative value to an empty bar', () => {
		const wrapper = mount(UiProgressBar, { props: { value: -20, max: 100, label: 'Usage' } });

		expect(fillWidth(wrapper)).toContain('width: 0%');
		expect(wrapper.attributes('aria-valuenow')).toBe('0');
	});

	it('renders an empty bar rather than NaN% when max is not positive', () => {
		// AccountView guarded `limit > 0` at the call site; the primitive owns that guard now, so the
		// next caller can't forget it.
		for (const max of [0, -5]) {
			const wrapper = mount(UiProgressBar, { props: { value: 5, max, label: 'Usage' } });

			expect(fillWidth(wrapper)).toContain('width: 0%');
			expect(fillWidth(wrapper)).not.toContain('NaN');
			expect(fillWidth(wrapper)).not.toContain('Infinity');
			expect(wrapper.attributes('aria-valuenow')).toBe('0');
		}
	});

	it('defaults max to 100 so value reads as a percentage', () => {
		const wrapper = mount(UiProgressBar, { props: { value: 40, label: 'Usage' } });

		expect(wrapper.attributes('aria-valuemax')).toBe('100');
		expect(fillWidth(wrapper)).toContain('width: 40%');
	});

	it('lands tone as a modifier class', () => {
		const warning = mount(UiProgressBar, { props: { value: 85, label: 'Usage', tone: 'warning' } });

		expect(warning.classes()).toContain('ui-progress-bar--warning');
		// Never auto-derived: a high value alone does not make the bar a warning.
		expect(mount(UiProgressBar, { props: { value: 99, label: 'Usage' } }).classes()).toContain(
			'ui-progress-bar--accent',
		);
	});
});
