import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StaticTextEdit from './StaticTextEdit.vue';

describe('StaticTextEdit', () => {
	it('renders the normalized label and the value', () => {
		const wrapper = mount(StaticTextEdit, { props: { label: 'created_by', value: 'admin' } });
		expect(wrapper.text()).toContain('Created by');
		expect(wrapper.find('.static-text__value').text()).toBe('admin');
	});

	it('renders NULL for a null value', () => {
		const wrapper = mount(StaticTextEdit, { props: { label: 'created_by', value: null } });
		expect(wrapper.find('.static-text__value').text()).toBe('NULL');
	});

	it('renders no value for an empty string', () => {
		const wrapper = mount(StaticTextEdit, { props: { label: 'created_by', value: '' } });
		expect(wrapper.find('.static-text__value').exists()).toBe(false);
	});

	it('has no form control', () => {
		const wrapper = mount(StaticTextEdit, { props: { label: 'created_by', value: 'x' } });
		expect(wrapper.find('input').exists()).toBe(false);
	});
});
