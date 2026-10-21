import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { mockWidgetStructure } from '../stories.mocks';
import BinaryFilter from './BinaryFilter.vue';
import { comparatorLabels, pickComparator, selectedComparator } from './filterTestUtils';

function inputValue(wrapper: ReturnType<typeof mount>) {
	return (wrapper.find('input').element as HTMLInputElement).value;
}

describe('BinaryFilter', () => {
	it('defaults to equal with an empty hex input', () => {
		const wrapper = mount(BinaryFilter, { props: { label: 'data' } });
		expect(comparatorLabels(wrapper)).toEqual(['equal', 'contains', 'starts with', 'is empty']);
		expect(selectedComparator(wrapper)).toBe('equal');
		expect(inputValue(wrapper)).toBe('');
		expect(wrapper.find('label').text()).toContain('Data (hex)');
		expect(wrapper.emitted('comparatorChange')).toBeUndefined();
	});

	it('normalizes the incoming hex and drops a malformed one', () => {
		expect(inputValue(mount(BinaryFilter, { props: { label: 'data', value: '48656c6c6f' } }))).toBe('48656c6c6f');
		expect(inputValue(mount(BinaryFilter, { props: { label: 'data', value: 'zz' } }))).toBe('');
	});

	it('emits the hex and the current comparator on input', async () => {
		const wrapper = mount(BinaryFilter, { props: { label: 'data' } });
		await wrapper.find('input').setValue('abcdef');
		expect(wrapper.emitted('fieldChange')).toEqual([['abcdef']]);
		expect(wrapper.emitted('comparatorChange')).toEqual([['eq']]);
	});

	it('clears the input in empty mode', async () => {
		const wrapper = mount(BinaryFilter, { props: { label: 'data', value: 'abcdef' } });
		await pickComparator(wrapper, 'is empty');
		expect(wrapper.emitted('comparatorChange')).toEqual([['empty']]);
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		expect(wrapper.find('input').exists()).toBe(false);
	});

	it('re-emits the current hex with contains / startswith', async () => {
		const wrapper = mount(BinaryFilter, { props: { label: 'data', value: 'abcdef' } });
		await pickComparator(wrapper, 'contains');
		await pickComparator(wrapper, 'starts with');
		expect(wrapper.emitted('comparatorChange')).toEqual([['contains'], ['startswith']]);
		expect(wrapper.emitted('fieldChange')).toEqual([['abcdef'], ['abcdef']]);
	});

	it('shows the hex error once edited', async () => {
		const wrapper = mount(BinaryFilter, { props: { label: 'data' } });
		await wrapper.find('input').setValue('abc');
		expect(wrapper.text()).toContain('Invalid hex.');
		expect((wrapper.find('input').element as HTMLInputElement).checkValidity()).toBe(false);
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
	});

	describe('encoding param', () => {
		const base64 = mockWidgetStructure({ encoding: 'base64' });

		it('seeds the input in the encoding from the incoming hex', () => {
			const wrapper = mount(BinaryFilter, { props: { label: 'data', value: '48656c6c6f', widgetStructure: base64 } });
			expect(inputValue(wrapper)).toBe('SGVsbG8=');
			expect(wrapper.find('label').text()).toContain('(base64)');
		});

		it('emits hex when the user types base64', async () => {
			const wrapper = mount(BinaryFilter, { props: { label: 'data', widgetStructure: base64 } });
			await wrapper.find('input').setValue('SGVsbG8=');
			expect(wrapper.emitted('fieldChange')).toEqual([['48656c6c6f']]);
			expect(wrapper.text()).not.toContain('Invalid base64.');
		});

		it('emits empty hex and shows the error for malformed base64', async () => {
			const wrapper = mount(BinaryFilter, { props: { label: 'data', widgetStructure: base64 } });
			await wrapper.find('input').setValue('!!!');
			expect(wrapper.emitted('fieldChange')).toEqual([['']]);
			expect(wrapper.text()).toContain('Invalid base64.');
		});

		it('emits hex when the user types ascii', async () => {
			const wrapper = mount(BinaryFilter, {
				props: { label: 'data', widgetStructure: mockWidgetStructure({ encoding: 'ascii' }) },
			});
			await wrapper.find('input').setValue('Hi');
			expect(wrapper.emitted('fieldChange')).toEqual([['4869']]);
		});
	});
});
