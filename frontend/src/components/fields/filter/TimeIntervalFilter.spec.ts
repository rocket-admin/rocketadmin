import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimeIntervalFilter from './TimeIntervalFilter.vue';

function values(wrapper: ReturnType<typeof mount>) {
	return wrapper.findAll('input').map((input) => (input.element as HTMLInputElement).value);
}

describe('TimeIntervalFilter', () => {
	it('renders years … seconds, all 0 without a value', () => {
		const wrapper = mount(TimeIntervalFilter, { props: { label: 'duration' } });
		expect(wrapper.findAll('label').map((label) => label.text())).toEqual([
			'years',
			'months',
			'days',
			'hours',
			'minutes',
			'seconds',
		]);
		expect(values(wrapper)).toEqual(['0', '0', '0', '0', '0', '0']);
	});

	it('parses an interval string, singular or plural units', () => {
		const wrapper = mount(TimeIntervalFilter, {
			props: { label: 'duration', value: '1 year 2 months 3 days 4 hour 5 minutes 6 second' },
		});
		expect(values(wrapper)).toEqual(['1', '2', '3', '4', '5', '6']);
	});

	it('emits the Postgres interval string on change', async () => {
		const wrapper = mount(TimeIntervalFilter, { props: { label: 'duration', value: '2 days' } });
		await wrapper.findAll('input')[3]?.setValue('1');
		expect(wrapper.emitted('fieldChange')).toEqual([['2 days 1 hour']]);
		await wrapper.findAll('input')[2]?.setValue('');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['1 hour']);
	});

	it('emits "0" for an all-zero interval', async () => {
		const wrapper = mount(TimeIntervalFilter, { props: { label: 'duration' } });
		await wrapper.findAll('input')[0]?.setValue('0');
		expect(wrapper.emitted('fieldChange')).toEqual([['0']]);
	});
});
