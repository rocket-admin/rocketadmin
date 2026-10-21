import DOMPurify from 'dompurify';
import { marked } from 'marked';

/** Markdown → sanitized HTML. The source is user data, so the output is always sanitized. */
export function renderMarkdown(source: string, options: { inline?: boolean } = {}): string {
	const html = options.inline
		? (marked.parseInline(source, { async: false }) as string)
		: (marked.parse(source, { async: false, gfm: true }) as string);
	return DOMPurify.sanitize(html);
}
