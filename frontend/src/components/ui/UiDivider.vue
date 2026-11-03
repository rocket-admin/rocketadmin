<script setup lang="ts">
/**
 * Separator line — the `mat-divider` replacement. A native `<hr>`, so AT reads it as a separator
 * without any ARIA; `vertical` adds `aria-orientation` and draws it as a full-height rule for
 * toolbars and flex rows. Margins are layout, so they come from the caller's `class`.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** A vertical rule between items in a row, stretched to the row's height. */
		vertical?: boolean;
	}>(),
	{ vertical: false },
);

const classes = computed(() => ['ui-divider', { 'ui-divider--vertical': props.vertical }]);
</script>

<template>
	<hr :class="classes" :aria-orientation="vertical ? 'vertical' : undefined">
</template>

<style scoped>
.ui-divider {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--color-line);
}

.ui-divider--vertical {
  align-self: stretch;
  width: 0;
  height: auto;
  border-top: 0;
  border-inline-start: 1px solid var(--color-line);
}
</style>
