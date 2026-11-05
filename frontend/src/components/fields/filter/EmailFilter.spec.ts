import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EmailFilter from './EmailFilter.vue';
import { comparatorLabels, pickComparator, selectedComparator } from './filterTestUtils';

describe('EmailFilter', () => {
	it('offers its own comparators and defaults to equal', () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email' } });
		expect(comparatorLabels(wrapper)).toEqual([
			'equal',
			'domain equal',
			'contains',
			'starts with',
			'ends with',
			'is empty',
		]);
		expect(selectedComparator(wrapper)).toBe('equal');
	});

	it('does not emit a comparator on mount in eq mode', () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email', value: 'a@b.c' } });
		expect(wrapper.emitted('comparatorChange')).toBeUndefined();
	});

	it('restores domain mode from an @domain value and emits endswith on mount', () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email', value: '@example.com' } });
		expect(selectedComparator(wrapper)).toBe('domain equal');
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('example.com');
		expect(wrapper.emitted('comparatorChange')).toEqual([['endswith']]);
	});

	it('prefixes the domain with @ and filters endswith', async () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email' } });
		await pickComparator(wrapper, 'domain equal');
		expect(wrapper.emitted('comparatorChange')).toEqual([['endswith']]);
		await wrapper.find('input').setValue('gmail.com');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['@gmail.com']);
		expect(wrapper.emitted('comparatorChange')?.at(-1)).toEqual(['endswith']);
	});

	it('emits the plain text with the current mode', async () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email' } });
		await pickComparator(wrapper, 'contains');
		await wrapper.find('input').setValue('user@test.com');
		expect(wrapper.emitted('fieldChange')?.at(-1)).toEqual(['user@test.com']);
		expect(wrapper.emitted('comparatorChange')).toEqual([['contains'], ['contains']]);
	});

	it('re-emits the value with the new comparator on a mode change', async () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email', value: 'user@test.com' } });
		await pickComparator(wrapper, 'starts with');
		expect(wrapper.emitted('comparatorChange')).toEqual([['startswith']]);
		expect(wrapper.emitted('fieldChange')).toEqual([['user@test.com']]);
	});

	it('clears the value and hides the input in empty mode', async () => {
		const wrapper = mount(EmailFilter, { props: { label: 'email', value: 'x@y.z' } });
		await pickComparator(wrapper, 'is empty');
		expect(wrapper.emitted('comparatorChange')).toEqual([['empty']]);
		expect(wrapper.emitted('fieldChange')).toEqual([['']]);
		expect(wrapper.find('input').exists()).toBe(false);
	});
});
