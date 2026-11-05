import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiField from './UiField.vue';
import UiRadio from './UiRadio.vue';
import UiRadioGroup from './UiRadioGroup.vue';

const OPTIONS: SelectOption<SelectValue>[] = [
	{ value: 'read', label: 'Read only' },
	{ value: 42, label: 'Forty-two' },
	{ value: null, label: 'None', disabled: true },
];

const radios = (wrapper: { findAll: (s: string) => Array<{ element: Element }> }) =>
	wrapper.findAll('input').map((input) => input.element as HTMLInputElement);

describe('UiRadioGroup + UiRadio', () => {
	it('renders a named radiogroup of native radios sharing one name', () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'Access' } });
		const group = wrapper.get('[role="radiogroup"]');
		const caption = wrapper.get('.ui-radio-group__label');

		expect(group.attributes('aria-labelledby')).toBe(caption.attributes('id'));
		expect(caption.text()).toBe('Access');
		const names = new Set(radios(wrapper).map((radio) => radio.name));
		expect(names.size).toBe(1);
		expect(radios(wrapper).every((radio) => radio.type === 'radio')).toBe(true);
	});

	it('uses the name prop when given', () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'Access', name: 'access' } });

		expect(radios(wrapper).map((radio) => radio.name)).toEqual(['access', 'access', 'access']);
	});

	it('checks the radio matching the typed model', async () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'Access', modelValue: 42 } });
		expect(radios(wrapper).map((radio) => radio.checked)).toEqual([false, true, false]);

		await wrapper.setProps({ modelValue: 'read' });
		expect(radios(wrapper).map((radio) => radio.checked)).toEqual([true, false, false]);
	});

	it('emits the typed value of the chosen radio', async () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'Access', modelValue: 'read' } });
		await wrapper.findAll('input')[1]!.setValue(true);

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([42]);
	});

	it('round-trips v-model with slotted UiRadios', async () => {
		const Host = defineComponent({
			components: { UiRadioGroup, UiRadio },
			setup: () => ({ value: ref<SelectValue>(true) }),
			template: `
        <UiRadioGroup v-model="value" label="Enabled">
          <UiRadio :value="true">Yes</UiRadio>
          <UiRadio :value="false">No</UiRadio>
        </UiRadioGroup>
        <output>{{ JSON.stringify(value) }}</output>
      `,
		});
		const wrapper = mount(Host);
		await wrapper.findAll('input')[1]!.setValue(true);

		expect(wrapper.get('output').text()).toBe('false');
		expect(radios(wrapper).map((radio) => radio.checked)).toEqual([false, true]);
	});

	it('disables single options and the whole group', async () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'Access' } });
		expect(radios(wrapper).map((radio) => radio.disabled)).toEqual([false, false, true]);

		await wrapper.setProps({ disabled: true });
		expect(radios(wrapper).every((radio) => radio.disabled)).toBe(true);
		expect(wrapper.attributes('aria-disabled')).toBe('true');
	});

	it('adds the orientation modifier', () => {
		const wrapper = mount(UiRadioGroup, { props: { options: OPTIONS, label: 'A', orientation: 'horizontal' } });

		expect(wrapper.classes()).toContain('ui-radio-group--horizontal');
	});

	it('takes its name, description and invalid state from a surrounding UiField', () => {
		const wrapper = mount(UiField, {
			props: { label: 'Access', hint: 'Applies to all tables', error: 'Pick one', required: true },
			slots: { default: () => h(UiRadioGroup, { options: OPTIONS }) },
		});
		const group = wrapper.get('[role="radiogroup"]');

		expect(group.attributes('aria-labelledby')).toBe(wrapper.get('.ui-field__label').attributes('id'));
		expect(group.attributes('aria-describedby')?.split(' ')).toEqual([
			wrapper.get('.ui-field__hint').attributes('id'),
			wrapper.get('.ui-field__error').attributes('id'),
		]);
		expect(group.attributes('aria-invalid')).toBe('true');
		expect(group.attributes('aria-required')).toBe('true');
	});

	it('refuses a UiRadio outside a group', () => {
		expect(() => mount(UiRadio, { props: { value: 'x' } })).toThrow(/UiRadioGroup/);
	});
});
