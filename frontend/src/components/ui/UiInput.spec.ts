import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiInput from './UiInput.vue';

/** The UiField wiring is pinned in `UiField.spec.ts`; this covers the control on its own. */
describe('UiInput', () => {
	it('defaults to a text input', () => {
		expect(mount(UiInput).get('input').attributes('type')).toBe('text');
	});

	it.each([
		'email',
		'password',
		'url',
		'search',
		'tel',
		'number',
		'date',
		'time',
		'datetime-local',
		'color',
	] as const)('renders type %s natively', (type) => {
		expect(mount(UiInput, { props: { type } }).get('input').attributes('type')).toBe(type);
	});

	it('round-trips a string through v-model', async () => {
		const wrapper = mount(UiInput, { props: { modelValue: 'a' } });
		const input = wrapper.get('input');

		expect(input.element.value).toBe('a');
		await input.setValue('ab');
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['ab']);
	});

	it('renders a null model as empty', () => {
		expect(mount(UiInput, { props: { modelValue: null } }).get('input').element.value).toBe('');
	});

	it('renders a numeric model, and emits the native string back', async () => {
		const wrapper = mount(UiInput, { props: { type: 'number', modelValue: 42 } });
		const input = wrapper.get('input');

		expect(input.element.value).toBe('42');
		await input.setValue('43');
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['43']);
	});

	it('renders a date model', () => {
		const wrapper = mount(UiInput, { props: { type: 'date', modelValue: '2026-10-21' } });

		expect(wrapper.get('input').element.value).toBe('2026-10-21');
	});

	it('adds the size modifier', () => {
		expect(mount(UiInput, { props: { size: 'sm' } }).classes()).toContain('ui-input--size-sm');
	});

	it('passes disabled and autocomplete through', () => {
		const input = mount(UiInput, { props: { disabled: true, autocomplete: 'email' } }).get('input');

		expect(input.attributes('disabled')).toBeDefined();
		expect(input.attributes('autocomplete')).toBe('email');
	});

	it('marks itself invalid standalone', () => {
		const wrapper = mount(UiInput, { props: { invalid: true } });

		expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
		expect(wrapper.classes()).toContain('ui-input--invalid');
	});
});
