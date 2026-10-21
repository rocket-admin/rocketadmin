import { describe, expect, it } from 'vitest';
import conventionsMd from '../CONVENTIONS.md?raw';
import conventionsMdx from './01-Conventions.mdx?raw';

/**
 * `CONVENTIONS.md` is the file a reviewer greps and a PR diffs; `01-Conventions.mdx` renders it in
 * Storybook. The MDX must render it via `<Markdown>{conventions}</Markdown>` rather than restating
 * it, because a hand copy drifts — that's exactly what happened to `.storybook/preview.css` before
 * Phase 1 replaced its 40-line duplicate of App.vue's globals with a 4-line Storybook-only override.
 *
 * This test guards the mechanism, not the prose: if someone pastes the text into the MDX instead of
 * importing it, the sync guarantee is gone even though the page still looks right that day.
 */
describe('ui conventions docs', () => {
	it('renders CONVENTIONS.md rather than a copy of it', () => {
		expect(conventionsMdx).toContain("import conventions from '../CONVENTIONS.md?raw'");
		expect(conventionsMdx).toContain('<Markdown>{conventions}</Markdown>');
	});

	it('holds no prose of its own beyond the wrapper', () => {
		// Everything outside the imports, the <Meta>, the sync-note comment and the <Markdown> call
		// would be prose that can drift from the .md. Keep this page a shell.
		const withoutComments = conventionsMdx.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
		const prose = withoutComments
			.split('\n')
			.map((line) => line.trim())
			.filter(
				(line) =>
					line !== '' && !line.startsWith('import ') && !line.startsWith('<Meta ') && !line.startsWith('<Markdown>'),
			);
		expect(prose).toEqual([]);
	});

	it('states the rules the primitives are reviewed against', () => {
		// A sanity check on the source of truth itself: these are the sentences a PR comment cites, so
		// silently dropping one should fail rather than just shrink the page. Whitespace is collapsed
		// so a re-wrap at the 100-column limit isn't a failure.
		const prose = conventionsMd.replace(/\s+/g, ' ');
		for (const rule of [
			'never both on one component',
			'always defaulted, always geometry-only',
			'not `notDismissible`',
			'a JSDoc line per prop',
			'never `left` / `right`',
			'BEM with a `ui-` block prefix',
			"`vue-tsc` catches a typo'd variant",
			'Passthrough is for **layout only**',
			'`inheritAttrs: false`',
			'never CSS values',
			'never `--palette-*` directly',
			"a11y: { test: 'error' }",
		]) {
			expect(prose, `CONVENTIONS.md dropped: ${rule}`).toContain(rule);
		}
	});
});
