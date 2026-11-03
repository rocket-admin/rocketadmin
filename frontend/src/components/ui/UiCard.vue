<script setup lang="ts">
/**
 * Content card. Replaces `.card` ×3 and `.auth-card` ×4, whose three drifting radii collapse onto
 * two tokenized shapes: `panel` (1rem, in-page content) and `auth` (1.5rem, the centred auth card).
 *
 * `padding: md` takes the AccountView/BillingView geometry; WebsitesView's `1.125rem 1.25rem`
 * merges into it, a ~2px change.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** `panel` = in-page content card. `auth` = the wider-radius, shadowed auth card. */
		shape?: 'panel' | 'auth';
		/** `none` when the card owns a full-bleed child such as a list or table. */
		padding?: 'md' | 'lg' | 'none';
		/** Hover lift and accent border, for cards that are themselves a link or button. */
		interactive?: boolean;
		/**
		 * Root element. `section` when the card is a titled region of the page — AccountView and
		 * BillingView stack five and three of those, and rendering them as `div` would flatten the
		 * document outline that their `<h2>`s hang off.
		 *
		 * Same closed union as `UiPageShell`'s `as`, and for the same reason: `as: string` would erase
		 * the check that makes `as="span"` a type error.
		 */
		as?: 'div' | 'section' | 'article' | 'li';
	}>(),
	{ shape: 'panel', padding: 'md', interactive: false, as: 'div' },
);

const classes = computed(() => [
	'ui-card',
	`ui-card--${props.shape}`,
	`ui-card--padding-${props.padding}`,
	{ 'ui-card--interactive': props.interactive },
]);
</script>

<template>
	<component :is="as" :class="classes">
		<slot />
	</component>
</template>

<style scoped>
.ui-card {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.ui-card--panel {
  border-radius: var(--radius-panel);
}

.ui-card--auth {
  width: 100%;
  border-radius: var(--radius-card);
}

.ui-card--padding-none {
  padding: 0;
}

.ui-card--padding-md {
  padding: var(--space-5) 1.375rem;
}

.ui-card--padding-lg {
  padding: var(--space-8);
}

.ui-card--interactive {
  transition:
    border-color var(--motion-fast),
    transform var(--motion-slow),
    box-shadow var(--motion-slow);
}

.ui-card--interactive:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lift);
}

/* The card is often a link wrapper; keep the ring on the card, not on a nested child. */
.ui-card--interactive:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--ring-focus);
}
</style>
