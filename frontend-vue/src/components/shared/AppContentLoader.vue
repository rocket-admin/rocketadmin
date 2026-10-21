<script setup lang="ts">
// Port of frontend/src/app/components/ui-components/content-loader (ContentLoaderComponent).
//
// The Angular loader was five pulsing dots absolutely centred in the nearest positioned ancestor,
// with its own `@keyframes pulse`. The design system owns exactly one spinner animation (UiSpinner),
// so this keeps the behaviour — centred over its container, announced as loading — on that
// primitive instead of declaring another keyframe.
import { UiSpinner } from '@/components/ui';

withDefaults(
	defineProps<{
		/** Announced to screenreaders while it shows. */
		label?: string;
	}>(),
	{ label: 'Loading' },
);
</script>

<template>
	<div class="app-content-loader">
		<UiSpinner size="lg" :label="label" />
	</div>
</template>

<style scoped>
.app-content-loader {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	color: var(--color-accent);
	pointer-events: none;
}
</style>
