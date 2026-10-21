<script setup lang="ts">
/**
 * Loading placeholder. Owns the canonical `@keyframes shimmer` and replaces the four hand-rolled
 * `.sk` blocks, which agreed on the gradient byte-for-byte and disagreed only on radius.
 *
 * That radius drift became the `shape` prop rather than being arbitrated away: three views want a
 * pill (text lines), while WebsiteDetailView's 3rem-tall block genuinely wants panel radius. Both
 * are right for their content.
 *
 * **A11y is half the point.** All four skeleton screens in the app announce nothing today. The
 * wrapper carries `role="status"` and a label *once*, and the bars are `aria-hidden` — so `lines: 3`
 * announces "Loading" once, not three times. Motion is guarded globally by `base.css`'s
 * `prefers-reduced-motion` block; there's deliberately no local media query.
 *
 * `decorative` is the other half of that rule for composite placeholders (the
 * `components/skeletons/Placeholder*` screens): a page-shaped skeleton is dozens of bars of
 * different sizes, which can't be one `lines` stack. There the placeholder's root owns the single
 * `role="status"` region and every UiSkeleton inside it is `decorative` — no role, no label,
 * `aria-hidden` — so the screen still announces once.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** CSS width, applied inline. The call sites need `40%`, `75%`, `60%`, `50%` — no token fits. */
		width?: string;
		/** CSS height, applied inline. The call sites need `1.1rem`, `0.85rem`, `3rem`. */
		height?: string;
		/**
		 * Geometry only. `line` for text placeholders, `block` for a panel-shaped area, `control` for a
		 * button- or field-shaped area (control radius), `circle` for an avatar or icon button.
		 */
		shape?: 'line' | 'block' | 'control' | 'circle';
		/** Bars to render inside the one labelled wrapper. */
		lines?: number;
		/** Announced while loading. Read once for the whole wrapper, however many bars it holds. */
		label?: string;
		/**
		 * Renders as a hidden part of a larger placeholder that owns the `role="status"` region: no
		 * role, no label, `aria-hidden`. Without it, every bar of a composite skeleton announces.
		 */
		decorative?: boolean;
	}>(),
	{ shape: 'line', lines: 1, label: 'Loading', decorative: false },
);

const barClasses = computed(() => ['ui-skeleton__bar', `ui-skeleton__bar--${props.shape}`]);

/**
 * `width`/`height` as pass-through inline styles are **the one accepted `:style` in a primitive** —
 * the real call sites need seven distinct values (`40%`, `75%`, `60%`, `50%`, `1.1rem`, `0.85rem`,
 * `3rem`) and no fixed token set covers percentages of an arbitrary container. Not a convention
 * breach; the convention is that colour never comes from here, and it doesn't.
 */
const barStyle = computed(() => ({ width: props.width, height: props.height }));

/** `lines` is a count, so a non-positive or fractional value would render nonsense. */
const count = computed(() => Math.max(1, Math.floor(props.lines)));

const wrapperA11y = computed(() =>
	props.decorative ? { 'aria-hidden': 'true' as const } : { role: 'status', 'aria-label': props.label },
);
</script>

<template>
	<div class="ui-skeleton" v-bind="wrapperA11y">
		<span
			v-for="line in count"
			:key="line"
			:class="barClasses"
			:style="barStyle"
			aria-hidden="true"
		/>
	</div>
</template>

<style scoped>
.ui-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-skeleton__bar {
  display: block;
  /* Fallback size for a bar given neither width nor height: a full-width text line. */
  width: 100%;
  height: var(--text-sm);
  background: linear-gradient(
    90deg,
    var(--color-paper-2) 25%,
    var(--color-line) 37%,
    var(--color-paper-2) 63%
  );
  /* 400% of the bar width is what makes the highlight read as a sweep rather than a flicker: the
     gradient is four bars wide, so only one band is visible at a time. */
  background-size: 400% 100%;
  animation: shimmer var(--shimmer-duration) ease infinite;
}

.ui-skeleton__bar--line {
  border-radius: var(--radius-pill);
}

.ui-skeleton__bar--block {
  border-radius: var(--radius-panel);
}

.ui-skeleton__bar--control {
  border-radius: var(--radius-control);
}

.ui-skeleton__bar--circle {
  flex-shrink: 0;
  border-radius: 50%;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
