import { describe, expect, it } from 'vitest';
import { readTokens, resolveToken } from './readTokens';

/**
 * Guards the CSS parse behind the Foundations docs. Without these, a theme.css reformat that broke
 * the regex would leave every swatch grid silently empty — the docs would look "fine", just blank.
 */
describe('readTokens', () => {
	it('finds every token group', () => {
		// Loose lower bounds: asserting exact counts would fail every time a token is added, which is
		// churn without signal. The point is that each group parsed at all.
		expect(readTokens('--palette-').length).toBeGreaterThan(15);
		expect(readTokens('--color-').length).toBeGreaterThan(15);
		expect(readTokens('--space-').length).toBeGreaterThan(10);
		expect(readTokens('--text-').length).toBe(7);
		expect(readTokens('--leading-').length).toBe(4);
		expect(readTokens('--weight-').length).toBe(4);
		expect(readTokens('--radius-').length).toBe(4);
		expect(readTokens('--shadow-').length).toBe(3);
		expect(readTokens('--z-').length).toBe(6);
	});

	it('reads names and values verbatim', () => {
		const [paper] = readTokens('--palette-blue-50');
		expect(paper).toEqual({ name: '--palette-blue-50', value: '#f5f8fe' });
	});

	it('captures the trailing comment as a note', () => {
		const [base] = readTokens('--text-base');
		expect(base?.note).toBe('15px');
	});

	it('does not leak the raw palette into the semantic group', () => {
		// `--color-` and `--palette-` must stay disjoint: components read the former, and a swatch
		// grid that mixed them would misrepresent which layer is safe to use.
		expect(readTokens('--color-').every((token) => !token.name.startsWith('--palette-'))).toBe(true);
	});

	describe('resolveToken', () => {
		it('follows an alias to its literal', () => {
			// The whole point of the indirection layer: --color-accent is var(--palette-blue-600).
			expect(readTokens('--color-accent')[0]?.value).toBe('var(--palette-blue-600)');
			expect(resolveToken('--color-accent')).toBe('#2b5cff');
		});

		it('returns a literal unchanged', () => {
			expect(resolveToken('--radius-pill')).toBe('999px');
		});

		it('returns undefined for an unknown token', () => {
			expect(resolveToken('--color-nope')).toBeUndefined();
		});

		it('leaves a composite value alone', () => {
			// Shadows embed var()s inside a longer value; only a whole-value alias is a hop.
			expect(resolveToken('--shadow-focus')).toBe('0 0 0 3px rgb(43 92 255 / 0.2)');
			expect(resolveToken('--ring-focus')).toBe('0 0 0 3px rgb(43 92 255 / 0.2)');
		});
	});
});
