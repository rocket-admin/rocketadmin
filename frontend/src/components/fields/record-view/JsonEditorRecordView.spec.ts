import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import JsonEditorRecordView from './JsonEditorRecordView.vue';

const textareaValue = (value: unknown) =>
	mount(JsonEditorRecordView, { props: { fieldKey: 'test', value } }).find<HTMLTextAreaElement>(
		'textarea[aria-label="test"]',
	).element.value;

describe('JsonEditorRecordView', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('shows a JSON string as stored, read-only, in json mode', () => {
		const wrapper = mount(JsonEditorRecordView, { props: { fieldKey: 'test', value: '{"key":"value"}' } });
		expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('{"key":"value"}');
		const editor = wrapper.findComponent(AppCodeEditor);
		expect(editor.props('language')).toBe('json');
		expect(editor.props('readonly')).toBe(true);
	});

	it('pretty-prints a parsed object', () => {
		expect(textareaValue({ a: [1] })).toBe('{\n    "a": [\n        1\n    ]\n}');
	});

	it('renders an empty editor for null', () => {
		expect(textareaValue(null)).toBe('');
	});
});
