<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-record-view.
// The row-view side panel: a "related records" header with a round button, then five key/value
// pairs separated by hairlines.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading record">
		<div class="ph__related">
			<UiSkeleton decorative shape="control" width="7.5rem" height="1.75rem" />
			<UiSkeleton decorative shape="circle" width="2.25rem" height="2.25rem" />
		</div>
		<div v-for="field in 5" :key="field" class="ph__field">
			<UiSkeleton decorative shape="control" width="7.5rem" height="1.25rem" />
			<UiSkeleton decorative shape="control" width="12.5rem" height="1.25rem" />
		</div>
	</div>
</template>

<style scoped>
.ph__related {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--space-2) 0 var(--space-4);
}

.ph__field {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	padding: var(--space-3) var(--space-4);
}

.ph__field:not(:last-child) {
	border-bottom: 1px solid var(--color-line);
}
</style>
