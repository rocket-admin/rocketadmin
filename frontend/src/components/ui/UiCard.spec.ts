import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiCard from './UiCard.vue';

/** Thin by design — UiCard is presentational, so there's little behaviour to pin beyond the API. */
describe('UiCard', () => {
	it('defaults to a padded panel', () => {
		const wrapper = mount(UiCard, { slots: { default: 'Body' } });

		expect(wrapper.classes()).toContain('ui-card--panel');
		expect(wrapper.classes()).toContain('ui-card--padding-md');
	});

	it('lands shape and padding as modifier classes', () => {
		const wrapper = mount(UiCard, { props: { shape: 'auth', padding: 'lg' } });

		expect(wrapper.classes()).toContain('ui-card--auth');
		expect(wrapper.classes()).toContain('ui-card--padding-lg');
	});

	it('adds the interactive modifier only when asked', () => {
		expect(mount(UiCard).classes()).not.toContain('ui-card--interactive');
		expect(mount(UiCard, { props: { interactive: true } }).classes()).toContain('ui-card--interactive');
	});

	it('renders its slot', () => {
		expect(mount(UiCard, { slots: { default: 'Body' } }).text()).toBe('Body');
	});

	it('renders a div by default and the requested landmark element on `as`', () => {
		expect(mount(UiCard).element.tagName).toBe('DIV');
		expect(mount(UiCard, { props: { as: 'section' } }).element.tagName).toBe('SECTION');
	});
});
