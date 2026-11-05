import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NumberFilter from './NumberFilter.vue';

describe('NumberFilter', () => {
	afterEach(() => vi.useRealTimers());

	it('renders a number input with the value and test id', () => {
		const wrapper = mount(NumberFilter, { props: { label: 'age', value: 42 } });
		const input = wrapper.find('[data-testid="record-age-number"]').element as HTMLInputElement;
		expect(input.type).toBe('number');
		expect(input.value).toBe('42');
	});

	it('emits the parsed number, and null for an emptied input', async () => {
		const wrapper = mount(NumberFilter, { props: { label: 'age', value: 1 } });
		await wrapper.find('input').setValue('3.5');
		await wrapper.find('input').setValue('');
		expect(wrapper.emitted('fieldChange')).toEqual([[3.5], [null]]);
	});

	it('honours autofocus', () => {
		vi.useFakeTimers();
		const wrapper = mount(NumberFilter, { props: { label: 'age', autofocus: true }, attachTo: document.body });
		vi.advanceTimersByTime(100);
		expect(document.activeElement).toBe(wrapper.find('input').element);
		wrapper.unmount();
	});
});
