import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Source-hygiene guard for the design system.
 *
 * The palette lives in `src/assets/theme.css` and nowhere else. Before this test existed the app
 * shipped two brands at once: ResetPasswordView and ConfirmEmailChangeView were written against
 * the pre-rebrand cyan (#0091ff) and never migrated, so a user hitting a password-reset link saw
 * a different product. Grepping for stray hex is the cheapest way to keep that from recurring —
 * a colour that isn't a `var()` can't follow the theme.
 *
 * The same argument extends to the spacing and type scales (rule 3 below): a `font-size: 0.9rem`
 * is how the app grew 20 distinct font sizes, nine of them inside a single 0.15rem band.
 *
 * Deliberately a test rather than a lint rule: Biome doesn't lint CSS inside Vue `<style>` blocks
 * and has no custom-rule authoring, and standing up Stylelint + postcss-html for two rules is more
 * toolchain than the problem deserves.
 */

// Resolved from the process cwd, which vitest pins to the `frontend-vue/` root. Vite serves
// modules over http:// during a jsdom run, so `import.meta.url` isn't a file: URL here.
const SRC = resolve(process.cwd(), 'src');

/** Hex colours that are legitimately not tokens, as `relative/path.vue:<hex>`. */
const HEX_ALLOWLIST = new Set<string>([]);

/**
 * Rule 3 — the three properties that carry the spacing and type scales.
 *
 * Deliberately just these three. `height`/`width`/`margin` are NOT covered: the plan names
 * font-size, gap and padding, and widening the rule is a separate decision with its own
 * violation list. (This is why UiProgressBar's `8px` track height doesn't appear below — it's a
 * height, and a track thickness isn't a scale value anyway.)
 */
const SCALED_PROPERTIES = ['font-size', 'gap', 'padding'] as const;

/**
 * Values that are never scale values, so never violations:
 * `padding: 0` is a reset, and the CSS-wide keywords are inheritance plumbing. There are 14 of
 * these across `src/` and every one is correct — flagging them would just mean writing
 * `var(--space-0)`, which is longer and says less.
 */
const SCALE_EXEMPT_VALUES = new Set(['0', 'inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/**
 * Declarations that are legitimately off the scale, as `relative/path.vue  <property>: <value>`.
 *
 * Same contract as HEX_ALLOWLIST: every entry carries the reason it is an exception, because an
 * entry without one is a suppression and the point of this rule is to make the exceptions legible.
 * Being awkward to tokenize is not a reason — the bar is "a token would be wrong here", not
 * "a token would be inconvenient here".
 */
const SCALE_ALLOWLIST = new Set<string>([]);

function vueFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return vueFiles(full);
		return entry.name.endsWith('.vue') ? [full] : [];
	});
}

const FILES = vueFiles(SRC).map((path) => ({
	path,
	id: relative(SRC, path),
	source: readFileSync(path, 'utf8'),
}));

/**
 * Every `font-size`/`gap`/`padding` declaration inside a `<style>` block whose value is a bare
 * literal, as `relative/path.vue  padding: 0.4rem 0.6rem`.
 *
 * SCOPE IS LENIENT ON PURPOSE: a value containing *any* `var()` is exempt, so
 * `padding: 0.7rem var(--space-5)` passes even though `0.7rem` is a literal.
 *
 * That looks like a hole and isn't. The strict reading — flag a literal even beside a `var()` —
 * flags 30 declarations instead of 14, and 16 of those are the primitive geometry the design
 * system deliberately arbitrated: UiButton's `md` (the plurality padding) and `lg`, UiCard's
 * `padding: md`, UiAlert's already-unanimous geometry, UiChip's `md`, UiInput's padding that all
 * four pre-DS copies agreed on. The only way to satisfy a strict rule is to mint `--space-*`
 * tokens for 0.7rem, 0.875rem, 1.375rem and 1.75rem — re-inflating the very scale that was
 * collapsed from 12 values to 11.
 *
 * So the half-token form is the intended idiom, not a lapse: it reads "this axis is on the scale,
 * this one is a tuned exception". If you came here because you saw `0.7rem` in UiButton and
 * assumed the rule was broken — it isn't.
 */
function scaleViolations(): string[] {
	const declaration = new RegExp(`(?<![-\\w])(${SCALED_PROPERTIES.join('|')})\\s*:\\s*([^;{}]+);`, 'g');

	return FILES.flatMap(({ id, source }) =>
		[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].flatMap((style) =>
			[...(style[1] ?? '').matchAll(declaration)]
				.map((match) => ({ property: match[1] ?? '', value: (match[2] ?? '').trim() }))
				.filter(({ value }) => !value.includes('var(') && !SCALE_EXEMPT_VALUES.has(value))
				.map(({ property, value }) => `${id}  ${property}: ${value}`)
				.filter((entry) => !SCALE_ALLOWLIST.has(entry)),
		),
	);
}

describe('design tokens', () => {
	it('finds Vue components to check', () => {
		// Guards the walker itself: a broken glob would make every assertion below vacuously pass.
		expect(FILES.length).toBeGreaterThan(5);
	});

	it('uses palette tokens instead of hex literals', () => {
		const offenders = FILES.flatMap(({ id, source }) =>
			(source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])
				.map((hex) => `${id}:${hex.toLowerCase()}`)
				.filter((entry) => !HEX_ALLOWLIST.has(entry)),
		);

		expect(offenders).toEqual([]);
	});

	// Landed report-only first so the 14-entry inventory could be reviewed before anyone argued
	// about allowlist entries; 13 turned out to be ordinary migrations and one a real exception.
	it('uses spacing and type tokens instead of raw literals', () => {
		expect(scaleViolations()).toEqual([]);
	});

	// `spin` and `shimmer` were copy-pasted into 2 and 4 views respectively, which is how the
	// skeleton radius drifted between them (pill in three views, panel in the fourth).
	//
	// This started as a ratchet that only ever went down, and Phase 8's five migrations took both
	// budgets to 1 — so the ratchet has served its purpose and becomes the flat rule it was aiming
	// at: each animation is declared exactly once, by the primitive that owns it. A view that
	// hand-rolls a spinner or shimmer again fails here.
	const KEYFRAME_OWNERS: Record<string, string> = {
		spin: 'components/ui/UiSpinner.vue',
		shimmer: 'components/ui/UiSkeleton.vue',
	};

	for (const [name, owner] of Object.entries(KEYFRAME_OWNERS)) {
		it(`declares @keyframes ${name} exactly once, in ${owner}`, () => {
			const declaring = FILES.filter(({ source }) => new RegExp(`@keyframes\\s+${name}\\b`).test(source)).map(
				({ id }) => id,
			);

			expect(declaring).toEqual([owner]);
		});
	}
});
