import DOMPurify from 'dompurify';
import { marked } from 'marked';

/** Markdown → sanitized HTML. The source is user data, so the output is always sanitized. */
export function renderMarkdown(source: string, options: { inline?: boolean } = {}): string {
	const html = options.inline
		? (marked.parseInline(source, { async: false }) as string)
		: (marked.parse(source, { async: false, gfm: true }) as string);
	return DOMPurify.sanitize(html);
}

// Mermaid diagrams (```mermaid fences), the ngx-markdown `mermaid` attribute the AI panel used. The
// library is ~1 MB, so it is imported on the first diagram, never at startup.
type Mermaid = typeof import('mermaid')['default'];

let mermaidLoader: Promise<Mermaid> | null = null;

/**
 * Loads and initializes mermaid once. Angular picked `dark` under `prefers-color-scheme: dark`; this
 * app has no dark theme yet (see theme.css), so diagrams use the default theme to match the page.
 */
export function loadMermaid(): Promise<Mermaid> {
	mermaidLoader ??= import('mermaid').then(({ default: mermaid }) => {
		mermaid.initialize({ startOnLoad: false, theme: 'default' });
		return mermaid;
	});
	return mermaidLoader;
}

/** How `renderMarkdown` emits a ```mermaid fence. */
const MERMAID_BLOCK = 'pre > code.language-mermaid';

/**
 * Swaps every ```mermaid code block inside `root` (HTML from `renderMarkdown`) for the rendered
 * diagram. Mermaid's default `securityLevel: 'strict'` sanitizes the diagram labels. A source that
 * fails to parse (a half-streamed AI answer) stays as its text; resolves without loading mermaid
 * when there is no diagram.
 */
export async function renderMermaidBlocks(root: HTMLElement): Promise<void> {
	const blocks = Array.from(root.querySelectorAll<HTMLElement>(MERMAID_BLOCK));
	if (!blocks.length) return;
	const nodes = blocks.map((code) => {
		const container = document.createElement('div');
		container.className = 'mermaid';
		container.textContent = code.textContent ?? '';
		(code.parentElement ?? code).replaceWith(container);
		return container;
	});
	const mermaid = await loadMermaid();
	await mermaid.run({ nodes, suppressErrors: true });
}
