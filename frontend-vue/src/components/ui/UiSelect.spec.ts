import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';
import UiField from './UiField.vue';
import UiSelect from './UiSelect.vue';

const TYPED: SelectOption<SelectValue>[] = [
	{ value: true, label: 'Yes' },
	{ value: 42, label: 'Forty-two' },
	{ value: null, label: 'Null' },
	{ value: 'text', label: 'Text' },
];

function mountSelect(props: Record<string, unknown> = {}) {
	return mount(UiSelect, { props: { options: TYPED, ...props } });
}

/** Picks the native option at `index` and fires `change`, as the browser would. */
async function choose(wrapper: ReturnType<typeof mountSelect>, index: number) {
	const select = wrapper.get('select');
	(select.element as HTMLSelectElement).selectedIndex = index;
	await select.trigger('change');
}

const lastEmit = (wrapper: ReturnType<typeof mountSelect>) => wrapper.emitted('update:modelValue')?.at(-1)?.[0];

describe('UiSelect', () => {
	it('renders one native option per option, labelled', () => {
		const options = mountSelect().findAll('option');

		expect(options.map((option) => option.text())).toEqual(['Yes', 'Forty-two', 'Null', 'Text']);
	});

	describe('typed values', () => {
		it.each([
			[0, true],
			[1, 42],
			[2, null],
			[3, 'text'],
		] as const)('emits option %i as its typed value', async (index, value) => {
			const wrapper = mountSelect();
			await choose(wrapper, index);

			expect(lastEmit(wrapper)).toBe(value);
		});

		it.each([
			[true, 0],
			[42, 1],
			[null, 2],
		] as const)('selects the option whose value is %s', (modelValue, index) => {
			const select = mountSelect({ modelValue }).get('select').element as HTMLSelectElement;

			expect(select.selectedIndex).toBe(index);
		});

		it('does not confuse the number 42 with the string "42"', () => {
			const wrapper = mount(UiSelect, {
				props: {
					options: [
						{ value: '42', label: 'String' },
						{ value: 42, label: 'Number' },
					],
					modelValue: 42,
				},
			});

			expect((wrapper.get('select').element as HTMLSelectElement).selectedIndex).toBe(1);
		});

		it('follows a model change from outside', async () => {
			const wrapper = mountSelect({ modelValue: true });
			await wrapper.setProps({ modelValue: 'text' });

			expect((wrapper.get('select').element as HTMLSelectElement).selectedIndex).toBe(3);
		});
	});

	describe('placeholder', () => {
		const options: SelectOption<string>[] = [
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' },
		];

		it('renders an empty first option, selected when nothing matches', () => {
			const wrapper = mount(UiSelect, { props: { options, placeholder: 'Choose…', modelValue: null } });
			const first = wrapper.findAll('option')[0]!;

			expect(first.text()).toBe('Choose…');
			expect(first.attributes('value')).toBe('');
			expect((wrapper.get('select').element as HTMLSelectElement).selectedIndex).toBe(0);
		});

		it('emits null when the placeholder is chosen', async () => {
			const wrapper = mount(UiSelect, { props: { options, placeholder: 'Choose…', modelValue: 'b' } });
			const select = wrapper.get('select');
			(select.element as HTMLSelectElement).selectedIndex = 0;
			await select.trigger('change');

			expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
		});

		it('maps the options after the placeholder to their own values', async () => {
			const wrapper = mount(UiSelect, { props: { options, placeholder: 'Choose…' } });
			const select = wrapper.get('select');
			(select.element as HTMLSelectElement).selectedIndex = 2;
			await select.trigger('change');

			expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b']);
		});

		it('is not rendered with multiple', () => {
			const wrapper = mount(UiSelect, { props: { options, placeholder: 'Choose…', multiple: true } });

			expect(wrapper.findAll('option')).toHaveLength(2);
		});
	});

	describe('multiple', () => {
		it('renders a native list box', () => {
			const select = mountSelect({ multiple: true, modelValue: [] }).get('select');

			expect(select.attributes('multiple')).toBeDefined();
			expect(select.classes()).toContain('ui-select--multiple');
		});

		it('selects every option in the model array', () => {
			const select = mountSelect({ multiple: true, modelValue: [true, null] }).get('select')
				.element as HTMLSelectElement;

			expect(Array.from(select.options).map((option) => option.selected)).toEqual([true, false, true, false]);
		});

		it('emits the typed values of every selected option', async () => {
			const wrapper = mountSelect({ multiple: true, modelValue: [] });
			const select = wrapper.get('select').element as HTMLSelectElement;
			select.options[1]!.selected = true;
			select.options[2]!.selected = true;
			await wrapper.get('select').trigger('change');

			expect(lastEmit(wrapper)).toEqual([42, null]);
		});

		it('emits an empty array when everything is deselected', async () => {
			const wrapper = mountSelect({ multiple: true, modelValue: [42] });
			const select = wrapper.get('select').element as HTMLSelectElement;
			select.options[1]!.selected = false;
			await wrapper.get('select').trigger('change');

			expect(lastEmit(wrapper)).toEqual([]);
		});
	});

	it('disables individual options', () => {
		const wrapper = mount(UiSelect, {
			props: {
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B', disabled: true },
				],
			},
		});

		expect(wrapper.findAll('option')[1]!.attributes('disabled')).toBeDefined();
	});

	it('disables the whole control', () => {
		expect(mountSelect({ disabled: true }).get('select').attributes('disabled')).toBeDefined();
	});

	it('adds the size modifier', () => {
		expect(mountSelect({ size: 'sm' }).classes()).toContain('ui-select--size-sm');
	});

	it('lands passthrough attrs on the select', () => {
		const select = mount(UiSelect, { props: { options: TYPED }, attrs: { class: 'w', name: 'pick' } }).get('select');

		expect(select.classes()).toContain('w');
		expect(select.attributes('name')).toBe('pick');
	});

	it('marks itself invalid standalone', () => {
		const wrapper = mountSelect({ invalid: true });

		expect(wrapper.get('select').attributes('aria-invalid')).toBe('true');
		expect(wrapper.classes()).toContain('ui-select--invalid');
	});

	describe('inside a UiField', () => {
		const mountField = (props: Record<string, unknown> = {}) =>
			mount(UiField, {
				props: { label: 'Plan', ...props },
				slots: { default: () => h(UiSelect, { options: TYPED }) },
			});

		it('takes the field id, so the label points at it', () => {
			const wrapper = mountField();
			const id = wrapper.get('select').attributes('id');

			expect(id).toBeTruthy();
			expect(wrapper.get('label').attributes('for')).toBe(id);
		});

		it('is described by the error, invalid and required', () => {
			const wrapper = mountField({ error: 'Pick one', required: true });
			const select = wrapper.get('select');

			expect(select.attributes('aria-describedby')).toBe(wrapper.get('.ui-field__error').attributes('id'));
			expect(select.attributes('aria-invalid')).toBe('true');
			expect(select.attributes('required')).toBeDefined();
		});

		it('is neither invalid nor required by default', () => {
			const select = mountField().get('select');

			expect(select.attributes('aria-invalid')).toBeUndefined();
			expect(select.attributes('required')).toBeUndefined();
		});
	});
});
