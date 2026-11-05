import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import { mockWidgetStructure } from '../stories.mocks';
import CodeRecordView from './CodeRecordView.vue';

describe('CodeRecordView', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('shows the value read-only in the code editor', () => {
		const wrapper = mount(CodeRecordView, {
			props: {
				fieldKey: 'test',
				value: 'console.log()',
				widgetStructure: mockWidgetStructure({ language: 'javascript' }),
			},
		});
		const textarea = wrapper.find<HTMLTextAreaElement>('textarea[aria-label="test"]');
		expect(textarea.element.value).toBe('console.log()');
		expect(textarea.element.readOnly).toBe(true);
		const editor = wrapper.findComponent(AppCodeEditor);
		expect(editor.props('language')).toBe('javascript');
		expect(editor.props('readonly')).toBe(true);
		expect(editor.props('options')).toEqual({ lineNumbers: 'off' });
	});

	it('falls back to plain text without a language param', () => {
		const wrapper = mount(CodeRecordView, { props: { value: 'x' } });
		expect(wrapper.findComponent(AppCodeEditor).props('language')).toBe('plaintext');
	});

	it('renders an empty editor for null', () => {
		const wrapper = mount(CodeRecordView, { props: { value: null } });
		expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('');
	});
});
