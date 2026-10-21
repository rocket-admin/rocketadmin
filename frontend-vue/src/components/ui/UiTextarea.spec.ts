import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import UiField from './UiField.vue';
import UiTextarea from './UiTextarea.vue';

describe('UiTextarea', () => {
	it('renders the model value and emits edits', async () => {
		const wrapper = mount(UiTextarea, { props: { modelValue: 'hello' } });
		const textarea = wrapper.get('textarea');

		expect(textarea.element.value).toBe('hello');
		await textarea.setValue('hello\nworld');
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['hello\nworld']);
	});

	it('renders a null model as empty', () => {
		const wrapper = mount(UiTextarea, { props: { modelValue: null } });

		expect(wrapper.get('textarea').element.value).toBe('');
	});

	it('passes rows, placeholder, disabled and readonly to the native control', () => {
		const wrapper = mount(UiTextarea, {
			props: { rows: 8, placeholder: 'Notes', disabled: true, readonly: true },
		});
		const textarea = wrapper.get('textarea');

		expect(textarea.attributes('rows')).toBe('8');
		expect(textarea.attributes('placeholder')).toBe('Notes');
		expect(textarea.attributes('disabled')).toBeDefined();
		expect(textarea.attributes('readonly')).toBeDefined();
	});

	it('adds the mono modifier', () => {
		expect(mount(UiTextarea, { props: { mono: true } }).classes()).toContain('ui-textarea--mono');
	});

	it('lands passthrough attrs on the textarea', () => {
		const wrapper = mount(UiTextarea, { attrs: { class: 'notes', name: 'notes' } });

		expect(wrapper.get('textarea').classes()).toContain('notes');
		expect(wrapper.get('textarea').attributes('name')).toBe('notes');
	});

	it('marks itself invalid standalone', () => {
		const wrapper = mount(UiTextarea, { props: { invalid: true } });

		expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true');
		expect(wrapper.classes()).toContain('ui-textarea--invalid');
	});

	it('is not invalid by default', () => {
		expect(mount(UiTextarea).get('textarea').attributes('aria-invalid')).toBeUndefined();
	});

	describe('inside a UiField', () => {
		const mountField = (props: Record<string, unknown> = {}) =>
			mount(UiField, {
				props: { label: 'Description', ...props },
				slots: { default: () => h(UiTextarea) },
			});

		it('takes the field id, so the label points at it', () => {
			const wrapper = mountField();
			const id = wrapper.get('textarea').attributes('id');

			expect(id).toBeTruthy();
			expect(wrapper.get('label').attributes('for')).toBe(id);
		});

		it('is described by the hint and error, and invalid', () => {
			const wrapper = mountField({ hint: 'Markdown allowed', error: 'Too long' });
			const textarea = wrapper.get('textarea');
			const ids = textarea.attributes('aria-describedby')?.split(' ');

			expect(ids).toContain(wrapper.get('.ui-field__hint').attributes('id'));
			expect(ids).toContain(wrapper.get('.ui-field__error').attributes('id'));
			expect(textarea.attributes('aria-invalid')).toBe('true');
		});

		it('is required when the field is', () => {
			expect(mountField({ required: true }).get('textarea').attributes('required')).toBeDefined();
		});
	});
});
