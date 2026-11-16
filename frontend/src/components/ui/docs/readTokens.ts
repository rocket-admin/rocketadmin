import themeCss from '@/assets/theme.css?raw';

/**
 * Reads design tokens straight out of `theme.css`, so the Foundations docs enumerate whatever the
 * theme actually declares.
 *
 * The alternative is a hand-maintained `tokens.ts` mirror. That is a second source of truth that
 * drifts silently and cannot be type-checked against the CSS. Vite's `?raw` gives us the file as a
 * string. Storybook shares the app's Vite config, so this needs no extra setup. The cost is a regex
 * over CSS, which `readTokens.spec.ts` guards. If a theme.css reformat breaks the parse, that test
 * fails. The docs do not quietly render empty.
 *
 * Note: this import needs `test.css: true` in vitest.config.ts. Vitest stubs stylesheet
 * transforms by default, which would make `?raw` resolve to an empty string under test only.
 */
export type Token = {
	/** Full custom-property name, including the leading `--`. */
	name: string;
	/** Declared value, verbatim. It can itself be a `var(--…)` reference. */
	value: string;
	/** The `/* … *\/` comment trailing the declaration on the same line, if any. */
	note?: string;
};

/** Matches one custom-property declaration plus any same-line trailing comment. */
const DECLARATION = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/gim;

/**
 * The base `:root` block only. The dark theme at the end of theme.css redeclares the colour aliases
 * inside `@media (prefers-color-scheme: dark)`; reading those too would list every alias twice.
 */
const BASE_CSS = themeCss.split(/@media\s*\(prefers-color-scheme:\s*dark\)/)[0] ?? '';

/**
 * Every token declared in theme.css's base block, in source order.
 *
 * Parsed once at module scope: the CSS is a build-time constant, so re-parsing per call would be
 * pure waste.
 */
const ALL_TOKENS: Token[] = [...BASE_CSS.matchAll(DECLARATION)].map(([, name, value, note]) => ({
	name: name as string,
	value: (value as string).trim(),
	...(note ? { note } : {}),
}));

/**
 * Tokens whose name starts with `prefix`.
 *
 * @param prefix Including the leading `--`, for example `'--color-'` or `'--space-'`.
 */
export function readTokens(prefix: string): Token[] {
	return ALL_TOKENS.filter((token) => token.name.startsWith(prefix));
}

/**
 * Resolves a token's value through the alias layer down to a literal.
 *
 * `--color-accent` is declared as `var(--palette-blue-600)`, which is the point of the indirection.
 * But a swatch needs the hex to display alongside it. Follows at most `maxDepth` hops so a
 * malformed self-reference cannot spin.
 */
export function resolveToken(name: string, maxDepth = 5): string | undefined {
	let current = ALL_TOKENS.find((token) => token.name === name)?.value;
	for (let depth = 0; depth < maxDepth; depth++) {
		if (current === undefined) return undefined;
		const alias = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(current);
		if (!alias) return current;
		current = ALL_TOKENS.find((token) => token.name === alias[1])?.value;
	}
	return current;
}
