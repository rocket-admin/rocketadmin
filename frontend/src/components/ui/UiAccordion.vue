<script setup lang="ts">
/**
 * Groups `UiExpansionPanel`s — the `mat-accordion` replacement. By default only one panel is open
 * at a time: opening one collapses the others. `multi` lifts that, leaving just the shared layout
 * (the `mat-accordion multi="true"` shape in the row-edit related-records list).
 *
 * Panels keep their own `v-model:open`, so a caller can still control any of them individually.
 */
import { computed, provide } from 'vue';
import { ACCORDION_CONTEXT } from './accordionContext';

const props = withDefaults(
	defineProps<{
		/** Lets several panels be open at once. */
		multi?: boolean;
	}>(),
	{ multi: false },
);

const panels = new Map<string, () => void>();

provide(ACCORDION_CONTEXT, {
	register: (id, close) => panels.set(id, close),
	unregister: (id) => panels.delete(id),
	opened(id) {
		if (props.multi) return;
		for (const [other, close] of panels) if (other !== id) close();
	},
});

const classes = computed(() => ['ui-accordion', { 'ui-accordion--multi': props.multi }]);
</script>

<template>
	<div :class="classes">
		<slot />
	</div>
</template>

<style scoped>
.ui-accordion {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
