import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimeEdit from './TimeEdit.vue';

describe('TimeEdit', () => {
	it('renders the normalized label and the value in a time input', () => {
		const wrapper = mount(TimeEdit, { props: { label: 'opens_at', fieldKey: 'k', value: '10:30' } });
		expect(wrapper.find('label').text()).toContain('Opens at');
		const input = wrapper.find('[data-testid="record-opens_at-time"]').element as HTMLInputElement;
		expect(input.type).toBe('time');
		expect(input.value).toBe('10:30');
	});

	it('emits the picked time', async () => {
		const wrapper = mount(TimeEdit, { props: { label: 'opens_at' } });
		await wrapper.find('input').setValue('08:15');
		expect(wrapper.emitted('fieldChange')).toEqual([['08:15']]);
	});

	it('passes disabled and readonly to the input', () => {
		const wrapper = mount(TimeEdit, { props: { label: 'opens_at', disabled: true, readonly: true } });
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.disabled).toBe(true);
		expect(input.readOnly).toBe(true);
	});
});
