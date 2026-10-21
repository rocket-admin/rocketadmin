import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiPageShell from './UiPageShell.vue';

describe('UiPageShell', () => {
	it('defaults to a top-aligned panel-width page', () => {
		const wrapper = mount(UiPageShell);

		expect(wrapper.classes()).toContain('ui-page-shell--align-top');
		expect(wrapper.classes()).toContain('ui-page-shell--width-panel');
	});

	it('lands align and width as modifier classes', () => {
		const wrapper = mount(UiPageShell, { props: { align: 'center', width: 'auth' } });

		expect(wrapper.classes()).toContain('ui-page-shell--align-center');
		expect(wrapper.classes()).toContain('ui-page-shell--width-auth');
	});

	it('renders a <div> root by default', () => {
		expect(mount(UiPageShell).element.tagName).toBe('DIV');
	});

	it('renders the landmark element when `as` asks for one', () => {
		// The reason this prop exists: without it every view had to wrap the shell in a redundant
		// <main> to keep its landmark, since the shell painted the page but couldn't be one.
		expect(mount(UiPageShell, { props: { as: 'main' } }).element.tagName).toBe('MAIN');
		expect(mount(UiPageShell, { props: { as: 'section' } }).element.tagName).toBe('SECTION');
	});

	it('keeps modifier classes on the swapped root', () => {
		const wrapper = mount(UiPageShell, { props: { as: 'main', align: 'center', width: 'auth' } });

		expect(wrapper.classes()).toContain('ui-page-shell');
		expect(wrapper.classes()).toContain('ui-page-shell--align-center');
	});

	it('renders its slot inside the width box, not the background', () => {
		// The nesting is the contract: the outer element paints the page, the inner one constrains
		// the column. Flattening them would make a full-bleed background impossible.
		const wrapper = mount(UiPageShell, { slots: { default: '<h1>Account</h1>' } });

		expect(wrapper.find('.ui-page-shell__content h1').exists()).toBe(true);
	});
});
