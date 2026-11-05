import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TextFilter from './TextFilter.vue';

describe('TextFilter', () => {
	afterEach(() => vi.useRealTimers());

	it('renders the normalized label, the value and the test id', () => {
		const wrapper = mount(TextFilter, { props: { label: 'first_name', fieldKey: 'k', value: 'Ada' } });
		expect(wrapper.find('label').text()).toContain('First name');
		const input = wrapper.find('[data-testid="record-first_name-text"]');
		expect((input.element as HTMLInputElement).value).toBe('Ada');
		expect(input.attributes('name')).toBe('first_name-k');
	});

	it('emits fieldChange with the typed text and never a comparator', async () => {
		const wrapper = mount(TextFilter, { props: { label: 'title' } });
		await wrapper.find('input').setValue('Hello');
		expect(wrapper.emitted('fieldChange')).toEqual([['Hello']]);
		expect(wrapper.emitted('comparatorChange')).toBeUndefined();
	});

	it('follows a value reset by the host', async () => {
		const wrapper = mount(TextFilter, { props: { label: 'title', value: 'x' } });
		await wrapper.setProps({ value: '' });
		expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
	});

	it('passes disabled and readonly to the input', () => {
		const wrapper = mount(TextFilter, { props: { label: 'title', disabled: true, readonly: true } });
		const input = wrapper.find('input').element as HTMLInputElement;
		expect(input.disabled).toBe(true);
		expect(input.readOnly).toBe(true);
	});

	it('focuses the input after the autofocus delay', () => {
		vi.useFakeTimers();
		const wrapper = mount(TextFilter, { props: { label: 'title', autofocus: true }, attachTo: document.body });
		const input = wrapper.find('input').element;
		expect(document.activeElement).not.toBe(input);
		vi.advanceTimersByTime(100);
		expect(document.activeElement).toBe(input);
		wrapper.unmount();
	});

	it('does not steal focus without autofocus', () => {
		vi.useFakeTimers();
		const wrapper = mount(TextFilter, { props: { label: 'title' }, attachTo: document.body });
		vi.advanceTimersByTime(200);
		expect(document.activeElement).not.toBe(wrapper.find('input').element);
		wrapper.unmount();
	});
});
