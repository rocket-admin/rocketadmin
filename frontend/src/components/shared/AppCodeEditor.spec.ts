import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import AppCodeEditor from './AppCodeEditor.vue';

/**
 * Monaco is mocked to reject in `src/test-setup.ts`, so these drive the `<textarea>` fallback —
 * which is also what a user gets until the Monaco chunk arrives.
 */

beforeEach(() => {
	setActivePinia(createPinia());
});

async function mountEditor(props: Record<string, unknown> = {}) {
	const wrapper = mount(AppCodeEditor, { props: { label: 'Query', ...props } });
	await flushPromises();
	return wrapper;
}

describe('AppCodeEditor', () => {
	it('falls back to a textarea when Monaco cannot load', async () => {
		const wrapper = await mountEditor({ modelValue: '{"a":1}' });
		const textarea = wrapper.get('textarea');

		expect(textarea.element.value).toBe('{"a":1}');
		expect(wrapper.find('.app-code-editor__fallback').exists()).toBe(true);
	});

	it('names the fallback with the label', async () => {
		const wrapper = await mountEditor({ label: 'Policy' });

		expect(wrapper.get('textarea').attributes('aria-label')).toBe('Policy');
	});

	it('emits edits from the fallback', async () => {
		const wrapper = await mountEditor({ modelValue: 'SELECT 1' });
		await wrapper.get('textarea').setValue('SELECT 2');

		expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['SELECT 2']);
	});

	it('follows a model change from outside', async () => {
		const wrapper = await mountEditor({ modelValue: 'a' });
		await wrapper.setProps({ modelValue: 'b' });

		expect(wrapper.get('textarea').element.value).toBe('b');
	});

	it('renders a null model as empty', async () => {
		const wrapper = await mountEditor({ modelValue: null });

		expect(wrapper.get('textarea').element.value).toBe('');
	});

	it('makes the fallback readonly', async () => {
		const wrapper = await mountEditor({ readonly: true });
		expect(wrapper.get('textarea').attributes('readonly')).toBeDefined();

		await wrapper.setProps({ readonly: false });
		expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined();
	});

	it('sizes the editor from height', async () => {
		const wrapper = await mountEditor({ height: '320px' });

		expect((wrapper.element as HTMLElement).style.height).toBe('320px');
	});

	it('survives a language change without Monaco', async () => {
		const wrapper = await mountEditor({ language: 'json' });
		await wrapper.setProps({ language: 'sql' });
		await flushPromises();

		expect(wrapper.find('textarea').exists()).toBe(true);
	});
});
