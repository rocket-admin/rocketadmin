import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MESSAGE } from '../useFieldWidget';
import MarkdownDisplay from './MarkdownDisplay.vue';
import { setupCopy } from './testing';

const title = (value: string | null) =>
	mount(MarkdownDisplay, { props: { value } }).get('.markdown-display__preview').text();

describe('MarkdownDisplay', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('uses the first heading as the title', () => {
		expect(title('# Main Title\n\nSome paragraph text here.')).toBe('Main Title');
		expect(title('## Secondary Title\n\nContent follows.')).toBe('Secondary Title');
	});

	it('prefers a heading over an earlier paragraph', () => {
		expect(title('Some intro text\n\n# Actual Title\n\nParagraph content.')).toBe('Actual Title');
	});

	it('falls back to the first paragraph', () => {
		expect(title('This is the first paragraph.\n\nThis is the second paragraph.')).toBe('This is the first paragraph.');
	});

	it('truncates at 100 characters', () => {
		expect(title(`# ${'a'.repeat(150)}`)).toBe(`${'a'.repeat(100)}...`);
	});

	it('shows inline markup in the title as plain text, like Angular', () => {
		const preview = mount(MarkdownDisplay, { props: { value: '# **Bold** title' } }).get('.markdown-display__preview');
		expect(preview.text()).toBe('**Bold** title');
		expect(preview.find('strong').exists()).toBe(false);
	});

	it('shows a dash for empty, null and whitespace-only markdown', () => {
		expect(title('')).toBe('—');
		expect(title(null)).toBe('—');
		expect(title('   \n\n   ')).toBe('—');
	});

	it('ignores code blocks and lists after the heading', () => {
		expect(title('# API Documentation\n\n```javascript\nconst x = 5;\n```')).toBe('API Documentation');
		expect(title('# Shopping List\n\n- Item 1\n- Item 2')).toBe('Shopping List');
	});

	it('shows the whole source as a tooltip', () => {
		const wrapper = mount(MarkdownDisplay, { props: { value: '# Hello\n\nworld' } });
		expect(wrapper.get('.markdown-display__preview').attributes('title')).toBe('# Hello\n\nworld');
	});

	it('copies the source', async () => {
		const { attachTo, clickCopy } = setupCopy();
		const result = await clickCopy(mount(MarkdownDisplay, { props: { value: '# Hello' }, attachTo }));
		expect(result).toEqual({ copied: ['# Hello'], emitted: [[COPIED_MESSAGE]], rowClicked: false });
	});
});
