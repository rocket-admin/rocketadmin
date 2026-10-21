import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FileDisplay from './FileDisplay.vue';

describe('FileDisplay', () => {
	it('captions Buffer data as "Binary Data"', () => {
		expect(mount(FileDisplay, { props: { value: { type: 'Buffer', data: [1, 2, 3] } } }).text()).toBe('Binary Data');
	});

	it('shows a short string as is', () => {
		expect(mount(FileDisplay, { props: { value: 'short.txt' } }).text()).toBe('short.txt');
	});

	it('captions a long string as "Binary Data"', () => {
		expect(mount(FileDisplay, { props: { value: 'a'.repeat(25) } }).text()).toBe('Binary Data');
	});

	it('shows a dash for null, without a copy button', () => {
		const wrapper = mount(FileDisplay, { props: { value: null } });
		expect(wrapper.text()).toBe('—');
		expect(wrapper.find('button').exists()).toBe(false);
	});
});
