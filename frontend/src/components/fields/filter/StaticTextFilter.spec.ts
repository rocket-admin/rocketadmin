import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StaticTextFilter from './StaticTextFilter.vue';

describe('StaticTextFilter', () => {
	it('renders the normalized label and the value', () => {
		const wrapper = mount(StaticTextFilter, { props: { label: 'created_by', value: 'system' } });
		expect(wrapper.text()).toContain('Created by');
		expect(wrapper.find('.static-text-filter__value').text()).toBe('system');
	});
});
