import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BooleanDisplay from './BooleanDisplay.vue';
import { widget } from './testing';

describe('BooleanDisplay', () => {
	it('shows a green check for true', () => {
		const icon = mount(BooleanDisplay, { props: { value: true } }).get('.boolean-display__icon');
		expect(icon.text()).toBe('check');
		expect(icon.attributes('aria-label')).toBe('True');
		expect(icon.classes()).toContain('boolean-display__icon--positive');
	});

	it('shows a red cross for false', () => {
		const icon = mount(BooleanDisplay, { props: { value: false } }).get('.boolean-display__icon');
		expect(icon.text()).toBe('close');
		expect(icon.classes()).toContain('boolean-display__icon--negative');
	});

	it('shows a dash for null', () => {
		const wrapper = mount(BooleanDisplay, { props: { value: null } });
		expect(wrapper.find('.boolean-display__icon').exists()).toBe(false);
		expect(wrapper.text()).toBe('—');
	});

	it('inverts colours when configured', () => {
		const props = { widgetStructure: widget({ invert_colors: true }) };
		expect(
			mount(BooleanDisplay, { props: { ...props, value: true } })
				.get('.boolean-display__icon')
				.classes(),
		).toContain('boolean-display__icon--negative');
		expect(
			mount(BooleanDisplay, { props: { ...props, value: false } })
				.get('.boolean-display__icon')
				.classes(),
		).toContain('boolean-display__icon--positive');
	});

	it('has no copy button', () => {
		expect(
			mount(BooleanDisplay, { props: { value: true } })
				.find('button')
				.exists(),
		).toBe(false);
	});
});

describe('BooleanDisplay without a value', () => {
	it('renders no icon', () => {
		const wrapper = mount(BooleanDisplay);
		expect(wrapper.find('.boolean-display__icon').exists()).toBe(false);
	});
});
