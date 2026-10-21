import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TimeIntervalEdit from './TimeIntervalEdit.vue';

const values = (wrapper: ReturnType<typeof mount>) =>
	wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value);

describe('TimeIntervalEdit', () => {
	it('renders the label and six empty unit inputs', () => {
		const wrapper = mount(TimeIntervalEdit, { props: { label: 'lease_term' } });
		expect(wrapper.find('legend').text()).toBe('Lease term');
		expect(wrapper.findAll('label').map((l) => l.text())).toEqual([
			'years',
			'months',
			'days',
			'hours',
			'minutes',
			'seconds',
		]);
		expect(values(wrapper)).toEqual(['', '', '', '', '', '']);
	});

	it('fills the inputs from an interval object', () => {
		const wrapper = mount(TimeIntervalEdit, {
			props: { label: 'term', value: { years: 1, months: 2, days: 3, hours: 4, minutes: 30, seconds: 0 } },
		});
		expect(values(wrapper)).toEqual(['1', '2', '3', '4', '30', '0']);
	});

	it('parses a raw interval string', () => {
		const wrapper = mount(TimeIntervalEdit, { props: { label: 'term', value: '1 year 01:30:00' } });
		expect(values(wrapper)).toEqual(['1', '', '', '1', '30', '']);
	});

	it('emits the Postgres interval string', async () => {
		const wrapper = mount(TimeIntervalEdit, { props: { label: 'term', value: { years: 1 } } });
		const inputs = wrapper.findAll('input');
		await inputs[2]?.setValue('5');
		await inputs[3]?.setValue('1');
		expect(wrapper.emitted('fieldChange')).toEqual([['1 year 5 days'], ['1 year 5 days 1 hour']]);
	});

	it('emits "0" when every unit is cleared', async () => {
		const wrapper = mount(TimeIntervalEdit, { props: { label: 'term', value: { days: 2 } } });
		await wrapper.findAll('input')[2]?.setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([['0']]);
	});

	it('passes required, disabled and readonly to every input', () => {
		const wrapper = mount(TimeIntervalEdit, {
			props: { label: 'term', required: true, disabled: true, readonly: true },
		});
		for (const input of wrapper.findAll('input').map((i) => i.element as HTMLInputElement)) {
			expect([input.required, input.disabled, input.readOnly]).toEqual([true, true, true]);
		}
	});
});
