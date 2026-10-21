import { mount } from '@vue/test-utils';
import axe, { type AxeResults, type ElementContext, type RunOptions } from 'axe-core';

/**
 * Runs axe-core over a mounted primitive, inside the existing jsdom vitest run.
 *
 * Why here and not in Storybook: `storybook test` is not a command that exists in Storybook 10 —
 * story testing moved to `@storybook/addon-vitest`, which drives stories in a real browser via
 * `@vitest/browser-playwright`. That is four dev dependencies, a ~150MB browser download CI must
 * also install, a second vitest project in browser mode, and a new CI job. This helper rides the
 * `pnpm vitest run` gate that already exists, at the cost of one dependency.
 *
 * What that trade actually costs: jsdom computes no layout and no real styles, so the rules axe
 * needs a rendered box for — `color-contrast` above all — cannot run here. That is the deliberate
 * gap. It is also the failure class the design system guards by construction: every colour in a
 * primitive is a `var(--color-*)` (enforced by design-tokens.spec.ts rule 1) and theme.css
 * documents each pair's contrast ratio inline. Contrast regressions are caught by review against
 * those ratios, and by the a11y panel in Storybook, which does run in a real browser.
 *
 * What it does catch is the class the primitives actually risk, and have actually shipped: ARIA
 * tree and labelling defects. Both near-misses during the Phase 8 migrations were exactly that —
 * three sibling `role="status"` regions in WebsitesView and AccountView, from putting one
 * `UiSkeleton` per card when `UiSkeleton`'s own wrapper is the live region. jsdom sees those fine.
 */

/**
 * Rules that cannot pass on an isolated component fragment, and would fail every primitive for
 * reasons that have nothing to do with the primitive.
 *
 * This is the same exemption `foundations.stories.ts` takes with `a11y: { disable: true }`, but
 * scoped to named rules instead of switching the whole check off: a document-structure rule is
 * asserting something about the *page*, and a mounted `UiChip` is not a page. The app's real
 * landmark and heading structure lives in the views and their `UiPageShell`, which is where a
 * future view-level suite would check it.
 */
const FRAGMENT_EXEMPT_RULES = [
	'region', // "all content must be in a landmark" — a fragment has no <main>
	'landmark-one-main',
	'page-has-heading-one',
	'html-has-lang',
	'document-title',
] as const;

/** Rules axe must not skip. Guards FRAGMENT_EXEMPT_RULES from quietly growing to cover a real bug. */
const NEVER_EXEMPT = [
	'aria-allowed-attr',
	'aria-allowed-role',
	'aria-required-attr',
	'aria-required-children',
	'aria-required-parent',
	'aria-roles',
	'aria-valid-attr',
	'aria-valid-attr-value',
	'button-name',
	'duplicate-id-aria',
	'label',
	'link-name',
] as const;

if (FRAGMENT_EXEMPT_RULES.some((rule) => (NEVER_EXEMPT as readonly string[]).includes(rule))) {
	throw new Error('a fragment exemption overlaps a rule that must always run');
}

const RUN_OPTIONS: RunOptions = {
	rules: Object.fromEntries(FRAGMENT_EXEMPT_RULES.map((rule) => [rule, { enabled: false }])),
};

/**
 * Mounts a component attached to `document.body` and returns axe's findings.
 *
 * `attachTo` matters: axe walks the real document, and @vue/test-utils mounts detached by default,
 * so an unattached wrapper yields zero violations no matter how broken the markup is — the check
 * would pass vacuously. The wrapper is always unmounted, including on failure, so one leaked node
 * can't contaminate the next test's document.
 *
 * Pass `skipIframes` for a primitive that renders an `<iframe>`. By default axe injects itself into
 * every frame to audit its contents, which jsdom cannot do for a frame with a real `src` — it
 * throws "Respondable target must be a frame in the current window". Skipping frames keeps the
 * audit on the host markup, which is the only part the primitive owns anyway: what's *inside* a
 * site preview is a third-party page, not this design system's contract.
 */
export async function axeViolations(
	component: Parameters<typeof mount>[0],
	options: Parameters<typeof mount>[1] & { skipIframes?: boolean } = {},
): Promise<AxeResults['violations']> {
	const { skipIframes, ...mountOptions } = options;
	const root = document.createElement('div');
	document.body.appendChild(root);

	const wrapper = mount(component, { ...mountOptions, attachTo: root });
	try {
		const results = await axe.run(root as ElementContext, {
			...RUN_OPTIONS,
			...(skipIframes ? { iframes: false } : {}),
		});
		return results.violations;
	} finally {
		wrapper.unmount();
		root.remove();
	}
}

/** `id — help text (selector, …)`, so a failure names the rule and the node without a debugger. */
export function formatViolations(violations: AxeResults['violations']): string {
	return violations
		.map((violation) => {
			const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
			return `${violation.id} — ${violation.help} (${targets})`;
		})
		.join('\n');
}
