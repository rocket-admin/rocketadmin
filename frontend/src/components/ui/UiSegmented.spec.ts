import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiSegmented from './UiSegmented.vue';

const OPTIONS: SelectOption<SelectValue>[] = [
	{ value: true, label: 'Yes' },
	{ value: false, label: 'No' },
	{ value: null, label: 'Null' },
	{ value: 42, label: '42' },
];

function mountSegmented(props: Record<string, unknown> = {}) {
	return mount(UiSegmented, { props: { options: OPTIONS, label: 'Active', ...props } });
}

const radios = (wrapper: ReturnType<typeof mountSegmented>) =>
	wrapper.findAll('input').map((input) => input.element as HTMLInputElement);

describe('UiSegmented', () => {
	it('is a named radiogroup of native radios', () => {
		const wrapper = mountSegmented();

		expect(wrapper.attributes('role')).toBe('radiogroup');
		expect(wrapper.attributes('aria-label')).toBe('Active');
		expect(radios(wrapper).every((radio) => radio.type === 'radio')).toBe(true);
		expect(wrapper.findAll('label').map((label) => label.text())).toEqual(['Yes', 'No', 'Null', '42']);
	});

	it('shares one radio name per group, distinct between groups', () => {
		// useId is per app, so the two groups must share one — the real case, a form with two toggles.
		const Host = defineComponent({
			components: { UiSegmented },
			setup: () => ({ options: OPTIONS }),
			template: '<div><UiSegmented :options="options" label="A" /><UiSegmented :options="options" label="B" /></div>',
		});
		const [groupA, groupB] = mount(Host).findAll('[role="radiogroup"]');
		const first = groupA!.findAll('input').map((input) => input.element as HTMLInputElement);
		const second = groupB!.findAll('input').map((input) => input.element as HTMLInputElement);

		expect(new Set(first.map((radio) => radio.name)).size).toBe(1);
		expect(first[0]!.name).toBeTruthy();
		expect(first[0]!.name).not.toBe(second[0]!.name);
	});

	it.each([
		[true, 0],
		[false, 1],
		[null, 2],
		[42, 3],
	] as const)('checks the segment whose value is %s', (modelValue, index) => {
		const wrapper = mountSegmented({ modelValue });

		expect(radios(wrapper).map((radio) => radio.checked)).toEqual([0, 1, 2, 3].map((i) => i === index));
		expect(wrapper.findAll('label')[index]!.classes()).toContain('ui-segmented__option--selected');
	});

	it('checks nothing when the model is undefined', () => {
		expect(radios(mountSegmented()).some((radio) => radio.checked)).toBe(false);
	});

	it.each([
		[0, true],
		[1, false],
		[2, null],
		[3, 42],
	] as const)('emits segment %i as its typed value', async (index, value) => {
		const wrapper = mountSegmented();
		await wrapper.findAll('input')[index]!.setValue(true);

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([value]);
	});

	it('follows a model change from outside', async () => {
		const wrapper = mountSegmented({ modelValue: true });
		await wrapper.setProps({ modelValue: null });

		expect(radios(wrapper)[2]!.checked).toBe(true);
	});

	it('disables every radio when disabled', () => {
		const wrapper = mountSegmented({ disabled: true });

		expect(radios(wrapper).every((radio) => radio.disabled)).toBe(true);
		expect(wrapper.attributes('aria-disabled')).toBe('true');
		expect(wrapper.classes()).toContain('ui-segmented--disabled');
	});

	it('disables a single option', () => {
		const wrapper = mount(UiSegmented, {
			props: {
				label: 'Unit',
				options: [
					{ value: 'kb', label: 'KB' },
					{ value: 'mb', label: 'MB', disabled: true },
				],
			},
		});

		expect(radios(wrapper as never).map((radio) => radio.disabled)).toEqual([false, true]);
		expect(wrapper.attributes('aria-disabled')).toBeUndefined();
	});

	it('adds the size modifier', () => {
		expect(mountSegmented({ size: 'sm' }).classes()).toContain('ui-segmented--size-sm');
	});
});
