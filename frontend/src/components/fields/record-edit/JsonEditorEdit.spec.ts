import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import JsonEditorEdit from './JsonEditorEdit.vue';

const editorText = (wrapper: ReturnType<typeof mount>) =>
	(wrapper.find('textarea').element as HTMLTextAreaElement).value;

describe('JsonEditorEdit', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('shows the value pretty-printed with 4 spaces in a JSON editor', () => {
		const value = { id: 1, name: 'test', settings: { enabled: true } };
		const wrapper = mount(JsonEditorEdit, { props: { label: 'metadata', value } });
		expect(editorText(wrapper)).toBe(JSON.stringify(value, undefined, 4));
		expect(wrapper.findComponent(AppCodeEditor).props('language')).toBe('json');
		expect(wrapper.text()).toContain('Metadata');
	});

	it('shows null as "null" and undefined as "{}"', () => {
		expect(editorText(mount(JsonEditorEdit, { props: { label: 'm', value: null } }))).toBe('null');
		expect(editorText(mount(JsonEditorEdit, { props: { label: 'm' } }))).toBe('{}');
	});

	it('shows arrays', () => {
		const wrapper = mount(JsonEditorEdit, { props: { label: 'm', value: [1, 2, 3] } });
		expect(JSON.parse(editorText(wrapper))).toEqual([1, 2, 3]);
	});

	it('emits the edited text unparsed', async () => {
		const wrapper = mount(JsonEditorEdit, { props: { label: 'm', value: {} } });
		await wrapper.find('textarea').setValue('{"a": 1');
		expect(wrapper.emitted('fieldChange')).toEqual([['{"a": 1']]);
	});
});
