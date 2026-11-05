import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DateFilter from './DateFilter.vue';

describe('DateFilter', () => {
	it('prepares the date for the date input', () => {
		const wrapper = mount(DateFilter, { props: { label: 'created', value: '2021-06-26T07:22:00.603' } });
		const input = wrapper.find('[data-testid="record-created-date"]').element as HTMLInputElement;
		expect(input.type).toBe('date');
		expect(input.value).toBe('2021-06-26');
	});

	it('leaves the date empty without a value', () => {
		const wrapper = mount(DateFilter, { props: { label: 'created', value: null } });
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
	});

	it('emits the new date value', async () => {
		const wrapper = mount(DateFilter, { props: { label: 'created' } });
		await wrapper.find('input').setValue('2021-07-26');
		expect(wrapper.emitted('fieldChange')).toEqual([['2021-07-26']]);
	});
});
