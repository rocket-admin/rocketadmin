import type { Meta, StoryObj } from '@storybook/vue3-vite';
import type { Component } from 'vue';
import ScaleSpecimens from './ScaleSpecimens.vue';
import SwatchGrid from './SwatchGrid.vue';
import TokenTable from './TokenTable.vue';
import TypeSpecimens from './TypeSpecimens.vue';

/**
 * Every visual on the Foundations pages, as a story.
 *
 * The indirection exists because `@storybook/addon-docs` compiles MDX to **React**: a `.vue`
 * component imported into an `.mdx` file is handed to `React.jsx()` and throws at render. A story is
 * the supported bridge — it's rendered by the Vue renderer — so the MDX pages carry the prose and
 * pull each grid in with `<Story of={...} />`.
 *
 * Every grid is driven by `readTokens()` reading `theme.css`, so adding a token to the theme makes
 * it appear here with no change to this file.
 *
 * Excluded from the sidebar (`tags: ['!dev']`) because these are page fragments, not components
 * anyone browses on their own.
 */
const meta = {
	title: 'Foundations/Specimens',
	tags: ['!dev', '!autodocs'],
	parameters: {
		// Specimens are colour and geometry samples with no accessible content of their own; running
		// the a11y check on a bare swatch grid only produces noise about missing landmarks.
		a11y: { disable: true },
		layout: 'fullscreen',
	},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Builds a story that renders one doc component with fixed props.
 *
 * Props are passed through `v-bind` rather than as story `args` on purpose: these are page fragments
 * with no controls, and `args` would put a useless props table on a doc-only story.
 */
function specimen(component: Component, props: Record<string, unknown>): Story {
	return {
		render: () => ({
			components: { Specimen: component },
			setup: () => ({ props }),
			template: '<Specimen v-bind="props" />',
		}),
	};
}

/* --- Color --- */

export const ColorSurfaces = specimen(SwatchGrid, {
	prefix: '--color-',
	bordered: true,
	only: ['--color-paper', '--color-paper-2', '--color-surface', '--color-surface-raised', '--color-overlay'],
});

export const ColorText = specimen(SwatchGrid, {
	prefix: '--color-',
	only: ['--color-ink', '--color-ink-soft', '--color-muted', '--color-muted-soft'],
});

export const ColorLinesAndAccent = specimen(SwatchGrid, {
	prefix: '--color-',
	bordered: true,
	only: ['--color-line', '--color-line-strong', '--color-accent', '--color-accent-ink', '--color-hot'],
});

export const ColorStatus = specimen(SwatchGrid, {
	prefix: '--color-',
	bordered: true,
	only: [
		'--color-danger',
		'--color-danger-strong',
		'--color-danger-bg',
		'--color-danger-border',
		'--color-warning',
		'--color-warning-bg',
		'--color-warning-border',
		'--color-success',
		'--color-success-bg',
		'--color-success-border',
	],
});

export const ColorPalette = specimen(SwatchGrid, { prefix: '--palette-', bordered: true });

export const ColorTable = specimen(TokenTable, { prefix: '--color-' });

/* --- Typography --- */

export const TypeFamilies = specimen(TypeSpecimens, { scale: 'family' });
export const TypeSizes = specimen(TypeSpecimens, { scale: 'size' });
export const TypeLeading = specimen(TypeSpecimens, { scale: 'leading' });
export const TypeWeights = specimen(TypeSpecimens, { scale: 'weight' });

/* --- Spacing --- */

export const SpacingScale = specimen(ScaleSpecimens, { scale: 'space' });
export const SpacingTable = specimen(TokenTable, { prefix: '--space-' });

/* --- Shape --- */

export const ShapeRadii = specimen(ScaleSpecimens, { scale: 'radius' });

/* --- Elevation --- */

export const ElevationOnPaper = specimen(ScaleSpecimens, { scale: 'shadow' });
export const ElevationOnSurface = specimen(ScaleSpecimens, { scale: 'shadow', onSurface: true });
export const ElevationRings = specimen(ScaleSpecimens, { scale: 'ring' });

/* --- Motion --- */

export const MotionDurations = specimen(ScaleSpecimens, { scale: 'motion' });
export const MotionTable = specimen(TokenTable, { prefix: '--motion-' });

/* --- Sizing and layering --- */

export const ZIndexTable = specimen(TokenTable, { prefix: '--z-' });
export const SizingTable = specimen(TokenTable, {
	// Explicit list rather than a prefix: --header-height doesn't share one with the width tokens.
	only: ['--header-height', '--width-panel', '--width-auth-card'],
});
