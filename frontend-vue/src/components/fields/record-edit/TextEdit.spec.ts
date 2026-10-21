import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { TableField, WidgetStructure } from '@/models/table';
import TextEdit from './TextEdit.vue';

const structure = (overrides: Partial<TableField> = {}): TableField => ({
	column_name: 'title',
	column_default: null,
	data_type: 'varchar',
	isExcluded: false,
	isSearched: false,
	allow_null: false,
	auto_increment: false,
	character_maximum_length: null,
	...overrides,
});

const widget = (widget_params: Record<string, unknown>): WidgetStructure => ({
	field_name: 'title',
	widget_type: 'String',
	widget_params,
	name: '',
	description: '',
});

describe('TextEdit', () => {
	it('renders the normalized label and the value', () => {
		const wrapper = mount(TextEdit, { props: { label: 'first_name', fieldKey: 'k', value: 'Ada' } });
		expect(wrapper.find('label').text()).toContain('First name');
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Ada');
	});

	it('emits field-change with the typed value', async () => {
		const wrapper = mount(TextEdit, { props: { label: 'title', structure: structure() } });
		await wrapper.find('input').setValue('Hello');
		expect(wrapper.emitted('fieldChange')).toEqual([['Hello']]);
	});

	it('emits null for an emptied nullable column', async () => {
		const wrapper = mount(TextEdit, {
			props: { label: 'title', value: 'x', structure: structure({ allow_null: true }) },
		});
		await wrapper.find('input').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('emits an empty string when force_send_empty_string is set', async () => {
		const wrapper = mount(TextEdit, {
			props: {
				label: 'title',
				value: 'x',
				structure: structure({ allow_null: true }),
				widgetStructure: widget({ force_send_empty_string: true }),
			},
		});
		await wrapper.find('input').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
	});

	it('shows the validator message and marks the control invalid', async () => {
		const wrapper = mount(TextEdit, { props: { label: 'email', widgetStructure: widget({ validate: 'isEmail' }) } });
		await wrapper.find('input').setValue('nope');
		expect(wrapper.text()).toContain('Invalid email address');
		expect((wrapper.find('input').element as HTMLInputElement).checkValidity()).toBe(false);
	});

	it('shows the counter near the length limit', () => {
		const wrapper = mount(TextEdit, {
			props: { label: 'title', value: 'abc', structure: structure({ character_maximum_length: 50 }) },
		});
		expect(wrapper.text()).toContain('3 / 50');
	});

	it('passes disabled and readonly to the input', () => {
		const wrapper = mount(TextEdit, { props: { label: 'title', disabled: true, readonly: true } });
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.disabled).toBe(true);
		expect(input.readOnly).toBe(true);
	});
});
