import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('renders block markdown', () => {
		expect(renderMarkdown('# Title\n\n**bold**')).toContain('<h1>Title</h1>');
		expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
	});

	it('renders inline markdown without a paragraph', () => {
		expect(renderMarkdown('**bold**', { inline: true })).toBe('<strong>bold</strong>');
	});

	it('strips scripts and event handlers', () => {
		const html = renderMarkdown('<img src="x" onerror="alert(1)"><script>alert(1)</script>');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<script');
	});
});
