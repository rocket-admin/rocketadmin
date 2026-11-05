import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimeFilter from './TimeFilter.vue';

describe('TimeFilter', () => {
	it('renders a time input with the value and test id', () => {
		const wrapper = mount(TimeFilter, { props: { label: 'opens_at', value: '10:30' } });
		const input = wrapper.find('[data-testid="record-opens_at-time"]').element as HTMLInputElement;
		expect(input.type).toBe('time');
		expect(input.value).toBe('10:30');
	});

	it('emits the time string', async () => {
		const wrapper = mount(TimeFilter, { props: { label: 'opens_at' } });
		await wrapper.find('input').setValue('09:15');
		expect(wrapper.emitted('fieldChange')).toEqual([['09:15']]);
	});
});
