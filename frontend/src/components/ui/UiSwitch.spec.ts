import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import UiField from './UiField.vue';
import UiSwitch from './UiSwitch.vue';

const input = (wrapper: { get: (s: string) => { element: Element } }) =>
	wrapper.get('input').element as HTMLInputElement;

describe('UiSwitch', () => {
	it('is a native checkbox with role="switch", wrapped by its label', () => {
		const wrapper = mount(UiSwitch, { props: { label: 'Dark mode' } });

		expect(wrapper.element.tagName).toBe('LABEL');
		expect(wrapper.get('input').attributes('type')).toBe('checkbox');
		expect(wrapper.get('input').attributes('role')).toBe('switch');
		expect(wrapper.text()).toBe('Dark mode');
	});

	it('lets the default slot replace the label prop', () => {
		const wrapper = mount(UiSwitch, { props: { label: 'Prop' }, slots: { default: () => 'Slot' } });

		expect(wrapper.text()).toBe('Slot');
	});

	it('reflects the model and marks the root', async () => {
		const wrapper = mount(UiSwitch, { props: { modelValue: true } });
		expect(input(wrapper).checked).toBe(true);
		expect(wrapper.classes()).toContain('ui-switch--checked');

		await wrapper.setProps({ modelValue: false });
		expect(input(wrapper).checked).toBe(false);
	});

	it('emits the new boolean on toggle', async () => {
		const wrapper = mount(UiSwitch, { props: { modelValue: false } });

		await wrapper.get('input').setValue(true);
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true]);
	});

	it('toggles when the label text is clicked', async () => {
		const wrapper = mount(UiSwitch, { props: { label: 'Dark mode' }, attachTo: document.body });
		await wrapper.get('.ui-switch__label').trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true]);
		wrapper.unmount();
	});

	it('disables the input', () => {
		const wrapper = mount(UiSwitch, { props: { disabled: true } });

		expect(input(wrapper).disabled).toBe(true);
		expect(wrapper.classes()).toContain('ui-switch--disabled');
	});

	it('adds the size and label-position modifiers', () => {
		const wrapper = mount(UiSwitch, { props: { size: 'sm', labelPosition: 'before' } });

		expect(wrapper.classes()).toEqual(expect.arrayContaining(['ui-switch--size-sm', 'ui-switch--label-before']));
	});

	it('puts layout class on the root and other attrs on the input', () => {
		const wrapper = mount(UiSwitch, { attrs: { class: 'm', name: 'notify', 'aria-label': 'Notify' } });

		expect(wrapper.classes()).toContain('m');
		expect(wrapper.get('input').attributes('name')).toBe('notify');
		expect(wrapper.get('input').attributes('aria-label')).toBe('Notify');
	});

	it('takes the id and describedby of a surrounding UiField', () => {
		const wrapper = mount(UiField, {
			props: { label: 'Notifications', hint: 'Sent by email' },
			slots: { default: () => h(UiSwitch, { label: 'Enabled' }) },
		});
		const switchInput = wrapper.get('input');

		expect(wrapper.get('label.ui-field__label').attributes('for')).toBe(switchInput.attributes('id'));
		expect(switchInput.attributes('aria-describedby')).toBe(wrapper.get('.ui-field__hint').attributes('id'));
	});
});
