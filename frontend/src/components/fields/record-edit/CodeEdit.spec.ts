import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import { mockWidgetStructure } from '../stories.mocks';
import CodeEdit from './CodeEdit.vue';

describe('CodeEdit', () => {
	beforeEach(() => setActivePinia(createPinia()));

	const mountCode = (props: Record<string, unknown> = {}) =>
		mount(CodeEdit, {
			props: {
				label: 'styles',
				value: '.container { display: flex; }',
				widgetStructure: mockWidgetStructure({ language: 'css' }),
				...props,
			},
		});

	it('renders the normalized label and the value in the editor', () => {
		const wrapper = mountCode({ label: 'custom_styles' });
		expect(wrapper.text()).toContain('Custom styles');
		const editor = wrapper.find('textarea[aria-label="Custom styles"]');
		expect((editor.element as HTMLTextAreaElement).value).toBe('.container { display: flex; }');
	});

	it('passes the widget language to the editor', () => {
		const wrapper = mountCode({ widgetStructure: mockWidgetStructure({ language: 'javascript' }) });
		expect(wrapper.findComponent(AppCodeEditor).props('language')).toBe('javascript');
	});

	it('falls back to plaintext without a language param', () => {
		const wrapper = mountCode({ widgetStructure: mockWidgetStructure() });
		expect(wrapper.findComponent(AppCodeEditor).props('language')).toBe('plaintext');
	});

	it('emits the edited code', async () => {
		const wrapper = mountCode();
		await wrapper.find('textarea').setValue('a { color: red; }');
		expect(wrapper.emitted('fieldChange')).toEqual([['a { color: red; }']]);
	});

	it('marks the field required and passes readonly', () => {
		const wrapper = mountCode({ required: true, readonly: true });
		expect(wrapper.text()).toContain('*');
		expect((wrapper.find('textarea').element as HTMLTextAreaElement).readOnly).toBe(true);
	});
});
