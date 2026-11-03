import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import JsonEditorFilter from './JsonEditorFilter.vue';

// Monaco is mocked away in test-setup, so AppCodeEditor renders its <textarea aria-label=label>.
function editor(wrapper: ReturnType<typeof mount>) {
	return wrapper.find('textarea').element as HTMLTextAreaElement;
}

describe('JsonEditorFilter', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('stringifies the value with 4-space indentation', () => {
		const wrapper = mount(JsonEditorFilter, {
			props: { label: 'config', value: { key: 'value', nested: { data: 123 } } },
		});
		expect(editor(wrapper).value).toBe(JSON.stringify({ key: 'value', nested: { data: 123 } }, undefined, 4));
		expect(editor(wrapper).getAttribute('aria-label')).toBe('Config');
	});

	it('keeps null as "null" and falls back to {} only for undefined', () => {
		expect(editor(mount(JsonEditorFilter, { props: { label: 'config', value: null } })).value).toBe('null');
		expect(editor(mount(JsonEditorFilter, { props: { label: 'config' } })).value).toBe('{}');
	});

	it('emits the editor text', async () => {
		const wrapper = mount(JsonEditorFilter, { props: { label: 'config' } });
		await wrapper.find('textarea').setValue('{"a":1}');
		expect(wrapper.emitted('fieldChange')).toEqual([['{"a":1}']]);
	});

	it('marks a required field and passes readonly', () => {
		const wrapper = mount(JsonEditorFilter, { props: { label: 'config', required: true, readonly: true } });
		expect(wrapper.find('.json-editor-filter__label').text()).toBe('Config *');
		expect(editor(wrapper).readOnly).toBe(true);
	});
});
