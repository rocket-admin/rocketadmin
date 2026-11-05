import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UiCheckbox from './UiCheckbox.vue';

function mountCheckbox(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
	return mount(UiCheckbox, { props, attrs, slots: { default: () => 'Remember me' } });
}

const input = (wrapper: ReturnType<typeof mountCheckbox>) => wrapper.get('input').element as HTMLInputElement;

describe('UiCheckbox', () => {
	it('is a native checkbox wrapped by its label', () => {
		const wrapper = mountCheckbox();

		expect(wrapper.element.tagName).toBe('LABEL');
		expect(wrapper.get('input').attributes('type')).toBe('checkbox');
		expect(wrapper.text()).toBe('Remember me');
	});

	it('reflects the model', async () => {
		const wrapper = mountCheckbox({ modelValue: true });
		expect(input(wrapper).checked).toBe(true);

		await wrapper.setProps({ modelValue: false });
		expect(input(wrapper).checked).toBe(false);
	});

	it('emits the new boolean on toggle', async () => {
		const wrapper = mountCheckbox({ modelValue: false });

		await wrapper.get('input').setValue(true);
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true]);

		await wrapper.get('input').setValue(false);
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
	});

	it('toggles when the label text is clicked', async () => {
		const wrapper = mount(UiCheckbox, {
			props: { modelValue: false },
			slots: { default: () => 'Remember me' },
			attachTo: document.body,
		});
		await wrapper.get('.ui-checkbox__label').trigger('click');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true]);
		wrapper.unmount();
	});

	it('sets the native indeterminate state, and still emits a boolean', async () => {
		const wrapper = mountCheckbox({ indeterminate: true });
		expect(input(wrapper).indeterminate).toBe(true);

		await wrapper.get('input').setValue(true);
		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true]);
	});

	it('disables the input and marks the root', () => {
		const wrapper = mountCheckbox({ disabled: true });

		expect(input(wrapper).disabled).toBe(true);
		expect(wrapper.classes()).toContain('ui-checkbox--disabled');
	});

	it('puts layout class/style on the root and other attrs on the input', () => {
		const wrapper = mountCheckbox({}, { class: 'row__check', style: 'margin: 0', name: 'remember', 'aria-label': 'X' });

		expect(wrapper.classes()).toContain('row__check');
		expect(wrapper.attributes('style')).toContain('margin');
		expect(wrapper.get('input').classes()).not.toContain('row__check');
		expect(wrapper.get('input').attributes('name')).toBe('remember');
		expect(wrapper.get('input').attributes('aria-label')).toBe('X');
		expect(wrapper.attributes('name')).toBeUndefined();
	});
});
