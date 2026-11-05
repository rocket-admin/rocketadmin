import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NumberEdit from './NumberEdit.vue';

describe('NumberEdit', () => {
	it('renders the normalized label and the value', () => {
		const wrapper = mount(NumberEdit, { props: { label: 'unit_price', fieldKey: 'k', value: 42 } });
		expect(wrapper.find('label').text()).toContain('Unit price');
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.type).toBe('number');
		expect(input.value).toBe('42');
		expect(input.name).toBe('unit_price-k');
	});

	it('renders null as empty', () => {
		const wrapper = mount(NumberEdit, { props: { label: 'qty', value: null } });
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
	});

	it('emits the parsed number', async () => {
		const wrapper = mount(NumberEdit, { props: { label: 'qty' } });
		await wrapper.find('[data-testid="record-qty-number"]').setValue('3.5');
		expect(wrapper.emitted('fieldChange')).toEqual([[3.5]]);
	});

	it('emits null when emptied', async () => {
		const wrapper = mount(NumberEdit, { props: { label: 'qty', value: 1 } });
		await wrapper.find('input').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[null]]);
	});

	it('passes disabled, readonly and required to the input', () => {
		const wrapper = mount(NumberEdit, { props: { label: 'qty', disabled: true, readonly: true, required: true } });
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.disabled).toBe(true);
		expect(input.readOnly).toBe(true);
		expect(input.required).toBe(true);
	});
});
