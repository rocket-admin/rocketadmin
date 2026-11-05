<script setup lang="ts">
/**
 * Determinate meter. Replaces AccountView's `.bar` / `.bar__fill` and the app's only inline style,
 * and fixes a real hole: the usage meter is currently invisible to assistive tech — no
 * `role="progressbar"`, no values, so a screenreader user sees a number with no sense of the budget.
 *
 * The clamping arithmetic lives here rather than at the call site. AccountView's `barWidth()` guarded
 * `limit > 0` to avoid a `NaN%` width; that guard is now the primitive's, so no future caller has to
 * remember it.
 *
 * `tone` is caller policy, not a threshold baked in here. "Warn at 80%" is a product decision that
 * differs per meter, so the primitive renders the tone it's given and never derives one.
 * Motion (the width transition) is guarded globally by `base.css`'s `prefers-reduced-motion` block.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Current value, in the same unit as `max`. Clamped into `[0, max]` for display. */
		value: number;
		/** Upper bound. A non-positive `max` renders an empty bar rather than `NaN%`. */
		max?: number;
		/** Required: becomes `aria-label`. A meter without a name is a defect, so there's no default. */
		label: string;
		/** Status colour. Non-interactive, so this is `tone`, not `variant`. Never auto-derived. */
		tone?: 'accent' | 'warning' | 'danger';
	}>(),
	{ max: 100, tone: 'accent' },
);

const classes = computed(() => ['ui-progress-bar', `ui-progress-bar--${props.tone}`]);

/** Guards `max <= 0` and a non-finite `value`, either of which would yield `NaN`/`Infinity`. */
const clamped = computed(() => {
	if (!Number.isFinite(props.value) || !Number.isFinite(props.max) || props.max <= 0) return 0;
	return Math.min(props.max, Math.max(0, props.value));
});

/**
 * `aria-valuenow` carries the raw clamped value, not the percentage — a screenreader says "7 of 10",
 * so passing 70 against a max of 10 would be nonsense.
 */
const percent = computed(() => (props.max > 0 ? `${Math.round((clamped.value / props.max) * 100)}%` : '0%'));
</script>

<template>
	<div
		:class="classes"
		role="progressbar"
		:aria-label="label"
		:aria-valuenow="clamped"
		aria-valuemin="0"
		:aria-valuemax="max"
	>
		<span class="ui-progress-bar__fill" :style="{ width: percent }" />
	</div>
</template>

<style scoped>
.ui-progress-bar {
  /* A track thickness, not spacing — deliberately off the 4px scale rather than forced onto
     --space-2, which would make the bar chunky. */
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-paper-2);
  overflow: hidden;
}

.ui-progress-bar__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  /* Inline width from the computed percentage — unavoidable, and the only dynamic value here. */
  transition: width var(--motion-slow) ease;
}

.ui-progress-bar--accent .ui-progress-bar__fill {
  background: var(--color-accent);
}

.ui-progress-bar--warning .ui-progress-bar__fill {
  background: var(--color-warning);
}

.ui-progress-bar--danger .ui-progress-bar__fill {
  background: var(--color-danger);
}
</style>
