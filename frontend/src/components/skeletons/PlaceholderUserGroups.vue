<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-user-groups.
// Three collapsed group panels: group name on the start side, a round action on the end.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading user groups">
		<div v-for="group in 3" :key="group" class="ph__panel">
			<UiSkeleton decorative shape="control" width="15rem" height="1.25rem" />
			<UiSkeleton decorative shape="circle" width="1.5rem" height="1.5rem" />
		</div>
	</div>
</template>

<style scoped>
.ph {
	margin-top: var(--space-4);
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
}

.ph__panel {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--space-10);
	padding: 0 var(--space-6);
}

.ph__panel:not(:last-child) {
	border-bottom: 1px solid var(--color-line);
}
</style>
