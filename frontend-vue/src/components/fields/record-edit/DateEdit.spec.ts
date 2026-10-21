import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DateEdit from './DateEdit.vue';

describe('DateEdit', () => {
	it('reduces the stored value to yyyy-MM-dd', () => {
		const wrapper = mount(DateEdit, { props: { label: 'birthday', value: '2021-06-26T12:22:00.603' } });
		const input = wrapper.find('[data-testid="record-birthday-date"]').element as HTMLInputElement;
		expect(input.type).toBe('date');
		expect(input.value).toBe('2021-06-26');
		expect(wrapper.find('label').text()).toContain('Birthday');
	});

	it('stays empty without a value', () => {
		const wrapper = mount(DateEdit, { props: { label: 'birthday', value: null } });
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
	});

	it('emits the picked date', async () => {
		const wrapper = mount(DateEdit, { props: { label: 'birthday' } });
		await wrapper.find('input').setValue('2021-07-26');
		expect(wrapper.emitted('fieldChange')).toEqual([['2021-07-26']]);
	});
});
