<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-table-view.
// The whole table page while the connection loads: the tables sidebar, then a header row (title,
// search, three buttons, a round icon button) over the table grid.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
import PlaceholderTableData from './PlaceholderTableData.vue';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading tables">
		<div class="ph__sidebar" />
		<div class="ph__main">
			<div class="ph__header">
				<UiSkeleton decorative shape="control" width="15vw" height="2.25rem" class="ph__title" />
				<UiSkeleton decorative shape="control" width="12.5rem" height="2.25rem" />
				<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
				<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
				<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
				<UiSkeleton decorative shape="circle" width="2.25rem" height="2.25rem" />
			</div>
			<PlaceholderTableData nested />
		</div>
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	height: 100%;
}

.ph__sidebar {
	width: 14%;
	max-width: 15rem;
	height: 100%;
	border-inline-end: 1px solid var(--color-line);
}

.ph__main {
	flex: 1;
	min-width: 0;
	padding: 0 var(--space-6) var(--space-6);
}

.ph__header {
	display: flex;
	align-items: center;
	gap: var(--space-3);
	margin-top: var(--space-2);
	padding: var(--space-3) 0;
}

.ph__title {
	margin-inline-end: auto;
}
</style>
