<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-saved-filters.
// The saved-filters strip above the table: a round edit button and three filter chips.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading saved filters">
		<UiSkeleton decorative shape="circle" width="2.25rem" height="2.25rem" class="ph__edit" />
		<UiSkeleton decorative shape="control" width="6.25rem" height="2rem" />
		<UiSkeleton decorative shape="control" width="9.375rem" height="2rem" />
		<UiSkeleton decorative shape="control" width="12.5rem" height="2rem" />
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	width: 100%;
}

.ph__edit {
	margin-inline-end: var(--space-2);
}
</style>
