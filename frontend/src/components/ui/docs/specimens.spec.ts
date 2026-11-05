import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import * as specimens from './foundations.stories';
import { readTokens } from './readTokens';
import ScaleSpecimens from './ScaleSpecimens.vue';
import SpecimenList from './SpecimenList.vue';
import SwatchGrid from './SwatchGrid.vue';
import TokenTable from './TokenTable.vue';
import TypeSpecimens from './TypeSpecimens.vue';

/**
 * The Foundations pages are as brittle as any other rendering code, and their failure mode is
 * silent: a broken prefix or a renamed slot prop yields an empty grid, and an empty grid looks like
 * a page that simply has nothing to show. These assert the grids are non-empty and that each
 * specimen actually paints with a `var()` rather than a copied literal.
 *
 * They also pin the MDX↔story contract. Every Foundations page pulls its visuals in with
 * `<Story of={Specimens.X} />`, which resolves at *runtime* in the Storybook manager — a story
 * renamed here fails as a blank panel in the browser, not as a build error. The
 * `story exports the MDX pages reference` test is what turns that into a red unit test instead.
 */

/** This directory. `process.cwd()` is the `frontend/` root — vitest.config.ts pins it. */
const DOCS = resolve(process.cwd(), 'src/components/ui/docs');

/** Renders one doc component with the same props its story passes. */
function render(component: Parameters<typeof mount>[0], props: Record<string, unknown>) {
	return mount(component, { props });
}

describe('SwatchGrid', () => {
	it('paints each chip with the token, not a resolved literal', () => {
		const wrapper = render(SwatchGrid, { prefix: '--color-accent', only: ['--color-accent'] });
		// The var() indirection is the point: a copied hex would keep looking right after the alias
		// chain broke, which is exactly the bug the docs are meant to expose.
		expect(wrapper.get('.swatch__chip').attributes('style')).toContain('var(--color-accent)');
	});

	it('shows the resolved literal and the alias it points at', () => {
		const wrapper = render(SwatchGrid, { prefix: '--color-', only: ['--color-accent'] });
		expect(wrapper.text()).toContain('#2b5cff');
		expect(wrapper.text()).toContain('var(--palette-blue-600)');
	});

	it('renders every token of a prefix when no subset is given', () => {
		const wrapper = render(SwatchGrid, { prefix: '--palette-' });
		expect(wrapper.findAll('.swatch')).toHaveLength(readTokens('--palette-').length);
	});

	it('ignores names in `only` that no token matches', () => {
		// A typo'd token name must drop the row rather than render a blank swatch that reads as real.
		const wrapper = render(SwatchGrid, { prefix: '--color-', only: ['--color-nope'] });
		expect(wrapper.findAll('.swatch')).toHaveLength(0);
	});
});

describe('TokenTable', () => {
	it('adds a "Resolves to" column only when the group holds aliases', () => {
		const aliased = render(TokenTable, { prefix: '--color-' });
		expect(aliased.text()).toContain('Resolves to');

		// The app scales are literals, so the column would just duplicate `Declared`.
		const literal = render(TokenTable, { prefix: '--space-' });
		expect(literal.text()).not.toContain('Resolves to');
	});

	it('surfaces the trailing theme.css comment as the note', () => {
		const wrapper = render(TokenTable, { prefix: '--text-base' });
		expect(wrapper.get('.token-table__note').text()).toBe('15px');
	});

	it('accepts an explicit token list for groups without a shared prefix', () => {
		const wrapper = render(TokenTable, {
			only: ['--header-height', '--width-panel', '--width-auth-card'],
		});
		expect(wrapper.findAll('tbody tr')).toHaveLength(3);
		expect(wrapper.text()).toContain('--header-height');
	});
});

describe('SpecimenList', () => {
	it('passes the token name as `cssVar`, not `name`', () => {
		// `:name` on a <slot> is the slot-name attribute, so exposing the token that way would
		// silently pass nothing. This is the regression guard for that mistake.
		const wrapper = mount(SpecimenList, {
			props: { prefix: '--radius-pill' },
			slots: { default: '<i>{{ params.cssVar }}|{{ params.value }}</i>' },
		});
		expect(wrapper.get('i').text()).toBe('--radius-pill|999px');
	});

	it('excludes named tokens', () => {
		const all = render(SpecimenList, { prefix: '--space-' });
		const without = render(SpecimenList, { prefix: '--space-', exclude: ['--space-25'] });
		expect(without.findAll('.specimen')).toHaveLength(all.findAll('.specimen').length - 1);
	});
});

describe('TypeSpecimens', () => {
	it.each([
		['family', 'font-family'],
		['size', 'font-size'],
		['leading', 'line-height'],
		['weight', 'font-weight'],
	] as const)('binds %s specimens to the %s property', (scale, property) => {
		const wrapper = render(TypeSpecimens, { scale });
		expect(wrapper.findAll('.specimen').length).toBeGreaterThan(0);
		expect(wrapper.get('.specimen__visual > *').attributes('style')).toContain(property);
	});
});

describe('ScaleSpecimens', () => {
	it.each([
		['space', 'width'],
		['radius', 'border-radius'],
		['shadow', 'box-shadow'],
		['ring', 'box-shadow'],
		['motion', 'transition-duration'],
	] as const)('binds %s specimens to the %s property', (scale, property) => {
		const wrapper = render(ScaleSpecimens, { scale });
		expect(wrapper.findAll('.specimen').length).toBeGreaterThan(0);
		expect(wrapper.get('.specimen__visual > *').attributes('style')).toContain(property);
	});
});

describe('foundations stories', () => {
	/**
	 * Story exports named in a `<Story of={Specimens.X} />`, read out of the MDX pages themselves.
	 *
	 * Scanned rather than hand-listed: a hand-maintained copy of what the pages embed is the same
	 * kind of drift this pair of tests exists to catch, one level up.
	 */
	const REFERENCED = [
		...new Set(
			readdirSync(DOCS)
				.filter((name) => name.endsWith('.mdx'))
				.flatMap((name) => [...readFileSync(join(DOCS, name), 'utf8').matchAll(/<Story\s+of=\{Specimens\.(\w+)\}/g)])
				.map(([, story]) => story as string),
		),
	];

	it('finds the story references in the MDX pages', () => {
		// Guards the scan itself: if the regex stopped matching, REFERENCED would be empty and both
		// assertions below would pass while checking nothing.
		expect(REFERENCED.length).toBeGreaterThan(15);
	});

	it.each(REFERENCED)('exports %s, which an MDX page references', (name) => {
		expect(specimens, `Foundations MDX references a story named ${name}`).toHaveProperty(name);
	});

	it('has no unreferenced stories', () => {
		// A specimen nobody embeds is dead weight — it renders nowhere, so nobody notices it rot.
		const exported = Object.keys(specimens).filter((key) => key !== 'default');
		expect(exported.sort()).toEqual([...REFERENCED].sort());
	});
});
