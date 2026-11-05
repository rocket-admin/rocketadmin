import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { pickComparator, selectedComparator } from './filterTestUtils';
import PhoneFilter from './PhoneFilter.vue';

describe('PhoneFilter', () => {
	it('defaults to equal and emits nothing on mount', () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone', value: '555' } });
		expect(selectedComparator(wrapper)).toBe('equal');
		expect(wrapper.emitted('comparatorChange')).toBeUndefined();
	});

	it('restores country mode from a dial code and emits startswith on mount', () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone', value: '+49' } });
		expect(selectedComparator(wrapper)).toBe('country code');
		expect((wrapper.find('input').element as HTMLInputElement).value).toContain('Germany (+49)');
		expect(wrapper.emitted('comparatorChange')).toEqual([['startswith']]);
	});

	it('emits the dial code of the picked country with startswith', async () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone' } });
		await pickComparator(wrapper, 'country code');
		expect(wrapper.emitted('comparatorChange')).toEqual([['startswith']]);
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);

		await wrapper.find('input').setValue('germany');
		await wrapper.find('[role="option"]').trigger('click');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['+49']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['startswith']);
	});

	it('filters countries by dial code too', async () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone' } });
		await pickComparator(wrapper, 'country code');
		await wrapper.find('input').setValue('+380');
		expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual([expect.stringContaining('Ukraine')]);
	});

	it('emits typed text with the current mode', async () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone' } });
		await pickComparator(wrapper, 'contains');
		await wrapper.find('input').setValue('123');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['123']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['contains']);
	});

	it('clears the value in empty mode', async () => {
		const wrapper = mount(PhoneFilter, { props: { label: 'phone', value: '555' } });
		await pickComparator(wrapper, 'is empty');
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		expect(wrapper.emitted('comparatorChange')).toEqual([['empty']]);
		expect(wrapper.find('input').exists()).toBe(false);
	});
});
