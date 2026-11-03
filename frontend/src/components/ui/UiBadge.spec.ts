import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiBadge from './UiBadge.vue';

describe('UiBadge', () => {
	it('overlays the wrapped content with a count', () => {
		const wrapper = mount(UiBadge, { props: { content: 1 }, slots: { default: '<span class="target">x</span>' } });

		expect(wrapper.find('.target').exists()).toBe(true);
		expect(wrapper.classes()).toContain('ui-badge--overlay');
		expect(wrapper.get('.ui-badge__indicator').text()).toBe('1');
	});

	it('renders a dot when given no content', () => {
		const indicator = mount(UiBadge).get('.ui-badge__indicator');

		expect(indicator.text()).toBe('');
		expect(indicator.classes()).toContain('ui-badge__indicator--dot');
	});

	it('caps large counts at max+', () => {
		expect(
			mount(UiBadge, { props: { content: 120 } })
				.get('.ui-badge__indicator')
				.text(),
		).toBe('99+');
		expect(
			mount(UiBadge, { props: { content: 12, max: 9 } })
				.get('.ui-badge__indicator')
				.text(),
		).toBe('9+');
	});

	it('hides the indicator but keeps the wrapped content', () => {
		const wrapper = mount(UiBadge, {
			props: { content: 1, hidden: true },
			slots: { default: '<span class="target">x</span>' },
		});

		expect(wrapper.find('.ui-badge__indicator').exists()).toBe(false);
		expect(wrapper.find('.target').exists()).toBe(true);
	});

	it('keeps the bare indicator out of the accessibility tree, and speaks its label instead', () => {
		const wrapper = mount(UiBadge, { props: { content: 1, label: 'Email not verified' } });

		expect(wrapper.get('.ui-badge__indicator').attributes('aria-hidden')).toBe('true');
		expect(wrapper.get('.ui-badge__label').text()).toBe('Email not verified');
	});

	it('lands tone as a modifier class', () => {
		expect(
			mount(UiBadge, { props: { tone: 'danger' } })
				.get('.ui-badge__indicator')
				.classes(),
		).toContain('ui-badge__indicator--danger');
	});
});
