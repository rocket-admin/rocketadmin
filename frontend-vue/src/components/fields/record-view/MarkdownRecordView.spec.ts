import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MarkdownRecordView from './MarkdownRecordView.vue';

describe('MarkdownRecordView', () => {
	it('renders the markdown', () => {
		const wrapper = mount(MarkdownRecordView, { props: { value: '# Test Markdown\n\nSome **bold**' } });
		expect(wrapper.find('h1').text()).toBe('Test Markdown');
		expect(wrapper.find('strong').text()).toBe('bold');
	});

	it('sanitizes HTML in the value', () => {
		const wrapper = mount(MarkdownRecordView, { props: { value: '<img src=x onerror="alert(1)">' } });
		expect(wrapper.html()).not.toContain('onerror');
	});

	it('renders nothing for null', () => {
		expect(mount(MarkdownRecordView, { props: { value: null } }).text()).toBe('');
	});
});
