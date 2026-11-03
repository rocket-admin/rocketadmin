<script setup lang="ts">
/**
 * A Material Symbols Outlined ligature icon — the `mat-icon` replacement. The font is loaded
 * globally (`@material-symbols/font-400/outlined.css` in main.ts and the Storybook preview), so this
 * is a styled `<span>` whose text content is the ligature name.
 *
 * **Decorative by default.** Almost every icon in the app sits next to text that already names the
 * thing (a button label, a menu item), so the span is `aria-hidden` — otherwise a screenreader reads
 * the ligature ("chevron_right") aloud. Pass `label` for the rare icon that carries meaning on its
 * own; it then becomes `role="img"` with that name. An icon-only *control* should be a
 * `UiIconButton`, whose button carries the name instead.
 *
 * `translate="no"` keeps browser page-translation from rewriting "delete" into another language and
 * breaking the ligature.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Ligature name from https://fonts.google.com/icons, e.g. `chevron_right`. */
		name: string;
		/** Geometry only: the glyph's box. `sm` 18px (inline with text), `md` 24px, `lg` 32px. */
		size?: 'sm' | 'md' | 'lg';
		/** Uses the filled glyph (the font's `FILL` axis) instead of the outline. */
		filled?: boolean;
		/** Makes the icon meaningful: `role="img"` named by this text. Omit for decorative icons. */
		label?: string;
	}>(),
	{ size: 'md', filled: false },
);

const classes = computed(() => [
	'material-symbols-outlined',
	'ui-icon',
	`ui-icon--size-${props.size}`,
	{ 'ui-icon--filled': props.filled },
]);

const a11y = computed(() =>
	props.label ? { role: 'img', 'aria-label': props.label } : { 'aria-hidden': 'true' as const },
);
</script>

<template>
	<span :class="classes" v-bind="a11y" translate="no">{{ name }}</span>
</template>

<style scoped>
.ui-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  line-height: 1;
  user-select: none;
  /* The outlined font's default axes, restated so `--filled` only has to flip one of them. */
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

.ui-icon--size-sm {
  width: calc(var(--space-4) + var(--space-05));
  height: calc(var(--space-4) + var(--space-05));
  font-size: calc(var(--space-4) + var(--space-05));
}

.ui-icon--size-md {
  width: var(--space-6);
  height: var(--space-6);
  font-size: var(--space-6);
}

.ui-icon--size-lg {
  width: var(--space-8);
  height: var(--space-8);
  font-size: var(--space-8);
}

.ui-icon--filled {
  font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;
}
</style>
