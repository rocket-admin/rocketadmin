import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BinaryDataCaptionDisplay from './BinaryDataCaptionDisplay.vue';

describe('BinaryDataCaptionDisplay', () => {
	it('displays the caption, or a dash when empty, without a copy button', () => {
		const wrapper = mount(BinaryDataCaptionDisplay, { props: { value: 'binary-data-placeholder' } });
		expect(wrapper.text()).toBe('binary-data-placeholder');
		expect(wrapper.find('button').exists()).toBe(false);
		expect(mount(BinaryDataCaptionDisplay, { props: { value: null } }).text()).toBe('—');
	});
});
