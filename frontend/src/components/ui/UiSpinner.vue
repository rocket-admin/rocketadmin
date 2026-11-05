<script setup lang="ts">
/**
 * The single spin animation. Two `@keyframes spin` copies live in the views today; this owns the
 * canonical one, and `design-tokens.spec.ts`'s keyframe budget ratchets down as they migrate.
 *
 * Landed in Phase 3 rather than Phase 5 because `UiButton`'s `loading` state mounts it.
 *
 * Announcement is opt-in via `label`: a spinner inside a button is decorative (the button already
 * carries `aria-busy` and its own label), while a standalone page spinner is the only thing on
 * screen and must announce. Guarded globally by `base.css`'s `prefers-reduced-motion` block.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/**
		 * Geometry only. `sm` sits inside `sm`/`md` buttons; `md` for standalone use; `lg` for a
		 * loader centred over a whole panel (AppContentLoader).
		 */
		size?: 'sm' | 'md' | 'lg';
		/** Announces the busy state via `role="status"`. Omit inside a button, which announces itself. */
		label?: string;
	}>(),
	{ size: 'md' },
);

const classes = computed(() => ['ui-spinner', `ui-spinner--size-${props.size}`]);
</script>

<template>
	<span
		:class="classes"
		:role="label ? 'status' : undefined"
		:aria-hidden="label ? undefined : 'true'"
	>
		<span class="ui-spinner__ring" />
		<span v-if="label" class="ui-spinner__label">{{ label }}</span>
	</span>
</template>

<style scoped>
.ui-spinner {
  display: inline-flex;
  align-items: center;
}

.ui-spinner__ring {
  display: block;
  border-radius: var(--radius-pill);
  /* currentColor on three sides, transparent on the fourth: the gap is what reads as motion, and
     inheriting the colour means the spinner needs no per-variant styling inside a button. */
  border: 2px solid currentColor;
  border-top-color: transparent;
  opacity: 0.85;
  animation: spin var(--spin-duration) linear infinite;
}

.ui-spinner--size-sm .ui-spinner__ring {
  width: 0.85rem;
  height: 0.85rem;
}

.ui-spinner--size-md .ui-spinner__ring {
  width: 1.1rem;
  height: 1.1rem;
}

.ui-spinner--size-lg .ui-spinner__ring {
  width: var(--space-8);
  height: var(--space-8);
  border-width: 3px;
}

/* Announced but not seen — the ring is the visual, the text is for AT. */
.ui-spinner__label {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
