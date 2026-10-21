# `ui/` conventions

Rules for every primitive in `src/components/ui/`. Surfaced verbatim in Storybook under
_Foundations → Conventions_, so this file is the single source of truth for both.

## Props

`variant` = interaction emphasis (`primary` / `secondary` / `ghost` / `danger`). `tone` = status
colour on non-interactive elements (Alert, Chip, ProgressBar). Separate words on purpose — a Chip
has no interaction variants, a Button has no status tones; **never both on one component**.

`size` = `'sm' | 'md' | 'lg'`, always defaulted, always geometry-only.

Booleans read as state, never negations: `disabled`, `loading`, `block`, `interactive`,
`dismissible` — not `notDismissible`.

Always `withDefaults(defineProps<{…}>(), {…})` with a JSDoc line per prop. The JSDoc is
non-negotiable: it feeds Storybook's autodocs prop table, which is the only place a consumer looks.

## Slots

`default` = primary content. `leading` / `trailing` for adornments — never `left` / `right` (RTL,
and these are logical positions). `footer` = action row. Scoped slots only where the child needs
generated ids (`UiField`).

## Classes

BEM with a `ui-` block prefix: `.ui-button`, `.ui-button__label`, `.ui-button--primary`,
`.ui-button--size-md`. A grep for `ui-button` then finds the primitive and nothing else.

Modifier classes are bound via a `:class` array computed in `<script setup>`, not template string
interpolation — so `vue-tsc` catches a typo'd variant.

## `class` passthrough: allowed

Vue's attribute fallthrough already does this; callers _will_ need one-off margins and widths, and
the alternatives (a `margin` prop, wrapper divs) are worse. Two guardrails:

1. Passthrough is for **layout only** — margin, width, grid-area, order. Never to repaint a
   variant; a new colour means a new variant in the primitive.
2. `UiField` / `UiModal` set `inheritAttrs: false` and `v-bind="$attrs"` onto the inner control or
   dialog explicitly, so `class` lands where the caller expects.

## Styling

Scoped `<style>`, plain CSS, tokens only. Every colour, radius, spacing, size, duration and
z-index comes from a `var(--…)` in `theme.css` — `design-tokens.spec.ts` fails the build on a hex
literal, and on a raw `font-size` / `gap` / `padding` value.

That last rule is **lenient by design**: a value containing any `var()` is exempt, so
`padding: 0.7rem var(--space-5)` passes. The half-token form is the intended idiom for arbitrated
geometry — one axis on the scale, one a tuned exception. Minting a `--space-*` token for every
one-off would re-inflate the scale the design system spent its first phase collapsing. A genuinely
off-scale value goes in `SCALE_ALLOWLIST` **with the reason it is off-scale**; an entry without one
is a suppression.

Read the **semantic** layer (`--color-*`, `--shadow-*`), never `--palette-*` directly. See
_Foundations → Color_ for why.

## Tests

Colocated `UiThing.spec.ts` next to `UiThing.vue`, testing **behaviour and contracts, never CSS
values**. A test asserting `padding: 0.7rem 1.25rem` is a change-detector that makes the design
system harder to evolve; Storybook and eyes cover appearance.

Assert instead: rendered element and attributes, ARIA wiring, emitted events, `v-model`
round-trips, and the _presence_ of a modifier class (not what that class paints).

**Add every new primitive to `__tests__/a11y.spec.ts`**, once per state whose ARIA shape differs
(loading, disabled, error, open, …) — not once per variant, since a tone changes only colour. That
file runs axe-core over each primitive in the existing jsdom vitest run, and it is the repo's only
automated accessibility gate: Biome does not parse Vue `<template>`, so its a11y rules never see
any markup. Read `__tests__/axe.ts` for what jsdom can't check — colour contrast above all, which
stays a review-against-the-documented-ratios job.

## Stories

Colocated `UiThing.stories.ts`, `tags: ['autodocs']`, and an `AllVariants` matrix story showing
every variant × size — that story is what catches "primary and secondary drifted". Review on all
three background toolbar options (paper / surface / ink) — contrast is the one thing the automated
gate can't see.

`a11y: { test: 'error' }` is set globally in `.storybook/preview.ts`; do **not** repeat it per
story. A new story is covered by default.
