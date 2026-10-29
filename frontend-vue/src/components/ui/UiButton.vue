<script setup lang="ts">
/**
 * The one button. Replaces ~19 hand-rolled blocks across the views — five `.btn` bases with five
 * different geometries, four `.submit`s, two `.github-button`s, `.btn-delete`, `.btn--sm`,
 * `.btn--option` and the header logout.
 *
 * Sizes are the plurality geometries, not an average: `md` matches the AccountView/BillingView pair
 * *and* `.submit`'s vertical rhythm, so every auth submit becomes `md` + `block` with no visual
 * change. See _Foundations → Conventions_ for the prop vocabulary.
 *
 * Polymorphism is two typed, mutually exclusive props rather than a generic `as`: `to` renders a
 * RouterLink, `href` an `<a>`, neither a `<button>`. `vue-tsc` then rejects `to` on an anchor, which
 * `as: string` would erase.
 */
import { computed, useAttrs } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { RouterLink } from 'vue-router';
import UiSpinner from './UiSpinner.vue';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(
	defineProps<{
		/** Interaction emphasis. Never a status colour — that's `tone`, and buttons don't have one. */
		variant?: ButtonVariant;
		/** Geometry only: padding and font-size. Never changes colour. */
		size?: ButtonSize;
		/** Renders as a RouterLink. Mutually exclusive with `href` and `type`. */
		to?: RouteLocationRaw;
		/** Renders as an `<a>`. Mutually exclusive with `to` and `type`. */
		href?: string;
		/** Native button type. Ignored when `to` or `href` is set. */
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Swaps the leading slot for a spinner and sets `aria-busy`. Implies `disabled`. */
		loading?: boolean;
		/** Stretches to the container width. Replaces `.submit { width: 100% }`. */
		block?: boolean;
	}>(),
	{ variant: 'primary', size: 'md', type: 'button' },
);

if (import.meta.env.DEV && props.to !== undefined && props.href !== undefined) {
	console.warn('[UiButton] `to` and `href` are mutually exclusive; `to` wins.');
}

const attrs = useAttrs();

/** `loading` implies `disabled` — a button mid-request must not fire twice. */
const isDisabled = computed(() => props.disabled || props.loading);

/**
 * A disabled link is not a link. Dropping `href`/`to` removes it from the tab order and from
 * "open in new tab", which `pointer-events: none` alone would not; `aria-disabled` carries the
 * state to AT, since only `<button>` supports the native `disabled` attribute.
 */
const tag = computed(() => {
	if (props.to !== undefined && !isDisabled.value) return RouterLink;
	if (props.to !== undefined || props.href !== undefined) return isDisabled.value ? 'span' : 'a';
	return 'button';
});

const isNativeButton = computed(() => tag.value === 'button');

const bindings = computed(() => {
	const shared = {
		'aria-busy': props.loading || undefined,
		'aria-disabled': !isNativeButton.value && isDisabled.value ? 'true' : undefined,
	};
	if (isNativeButton.value) return { ...shared, type: props.type, disabled: isDisabled.value };
	// A <span> standing in for a disabled link keeps the role so AT still announces it as one.
	if (isDisabled.value) return { ...shared, role: 'link' };
	return props.to !== undefined ? { ...shared, to: props.to } : { ...shared, href: props.href };
});

const classes = computed(() => [
	'ui-button',
	`ui-button--${props.variant}`,
	`ui-button--size-${props.size}`,
	{ 'ui-button--block': props.block, 'ui-button--loading': props.loading },
]);

/** The spinner inherits the label's colour, so it needs no per-variant styling. */
const spinnerSize = computed(() => (props.size === 'sm' ? 'sm' : 'md'));

/** Click is suppressed on the non-native tags, where `disabled` isn't enforced by the browser. */
function onClick(event: MouseEvent) {
	if (isDisabled.value && !isNativeButton.value) {
		event.preventDefault();
		event.stopPropagation();
	}
}
</script>

<script lang="ts">
// The root binds `attrs` itself. Inheriting them too would add a parent's listeners twice: a menu
// trigger with its own @click then runs the menu's toggle twice and never opens.
export default {
  inheritAttrs: false,
}
</script>

<template>
	<component :is="tag" v-bind="{ ...attrs, ...bindings }" :class="classes" @click="onClick">
		<!-- The spinner replaces the leading adornment rather than displacing it, so the button's
         width doesn't jump when a request starts. -->
		<span v-if="loading" class="ui-button__adornment">
			<UiSpinner :size="spinnerSize" />
		</span>
		<span v-else-if="$slots.leading" class="ui-button__adornment">
			<slot name="leading" />
		</span>

		<span class="ui-button__label"><slot /></span>

		<span v-if="$slots.trailing" class="ui-button__adornment">
			<slot name="trailing" />
		</span>
	</component>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--motion-fast),
    border-color var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-base),
    box-shadow var(--motion-base);
}

/* :focus-visible, not :focus — the pre-DS code rang the focus ring on mouse clicks too. */
.ui-button:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

.ui-button--block {
  width: 100%;
}

/* --- Sizes --- */

.ui-button--size-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
}

.ui-button--size-md {
  padding: 0.7rem var(--space-5);
  font-size: var(--text-base);
}

.ui-button--size-lg {
  padding: var(--space-2) 1.75rem;
  font-size: var(--text-md);
}

/* --- Variants --- */

.ui-button--primary {
  background: var(--color-accent);
  color: var(--color-surface);
}

.ui-button--primary:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--color-accent-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lift);
}

/* Inherits `.btn--option`'s accent lift: it's the nicer interaction, and secondary is the
   app's most-clicked affordance. */
.ui-button--secondary {
  background: var(--color-surface);
  border-color: var(--color-line);
  color: var(--color-ink-soft);
}

.ui-button--secondary:hover:not(:disabled, [aria-disabled='true']) {
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lift);
}

/* Ghost keeps the quieter hover — it's for the recessive action next to a primary. */
.ui-button--ghost {
  background: var(--color-surface);
  border-color: var(--color-line);
  color: var(--color-muted);
}

.ui-button--ghost:hover:not(:disabled, [aria-disabled='true']) {
  border-color: var(--color-muted-soft);
  color: var(--color-ink);
}

.ui-button--danger {
  background: var(--color-surface);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.ui-button--danger:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--color-danger-bg);
}

.ui-button--danger:focus-visible {
  box-shadow: var(--ring-danger);
}

.ui-button:active:not(:disabled, [aria-disabled='true']) {
  transform: translateY(0);
}

.ui-button:disabled,
.ui-button[aria-disabled='true'] {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ui-button__adornment {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.ui-button__label {
  display: inline-flex;
  align-items: center;
}

/* An empty label would otherwise leave a stray gap next to an icon-only button. */
.ui-button__label:empty {
  display: none;
}
</style>
