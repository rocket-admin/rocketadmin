import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import MarkdownEdit from './MarkdownEdit.vue';

describe('MarkdownEdit', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('shows the source in a markdown editor', () => {
		const value = '# Hello World\n\nThis is **bold** text.';
		const wrapper = mount(MarkdownEdit, { props: { label: 'product_description', value } });
		expect(wrapper.text()).toContain('Product description');
		expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(value);
		expect(wrapper.findComponent(AppCodeEditor).props('language')).toBe('markdown');
	});

	it('emits the edited source', async () => {
		const wrapper = mount(MarkdownEdit, { props: { label: 'description', value: 'test' } });
		await wrapper.find('textarea').setValue('**new**');
		expect(wrapper.emitted('fieldChange')).toEqual([['**new**']]);
	});

	it('passes readonly to the editor', () => {
		const wrapper = mount(MarkdownEdit, { props: { label: 'description', readonly: true } });
		expect((wrapper.find('textarea').element as HTMLTextAreaElement).readOnly).toBe(true);
	});
});
