import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PasswordDisplay from './PasswordDisplay.vue';

describe('PasswordDisplay', () => {
	it('always masks the value and offers no copy', () => {
		const wrapper = mount(PasswordDisplay, { props: { value: 'secret' } });
		expect(wrapper.text()).toBe('••••••••');
		expect(wrapper.text()).not.toContain('secret');
		expect(wrapper.find('button').exists()).toBe(false);
	});
});
