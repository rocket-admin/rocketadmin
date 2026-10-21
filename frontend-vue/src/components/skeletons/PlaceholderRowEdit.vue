<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-row-edit.
// The row-edit page: breadcrumbs, five fields in a centred column, and the save bar with three
// buttons.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiIcon, UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading row">
		<div class="ph-crumbs">
			<UiSkeleton decorative shape="control" width="7.5rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="10.75rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
		</div>
		<div class="ph__form">
			<UiSkeleton v-for="field in 5" :key="field" decorative shape="control" height="2.75rem" />
		</div>
		<div class="ph-actions">
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" class="ph-actions__start" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
		</div>
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--space-8) 0 0;
}

.ph__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
	width: 96%;
	min-width: 18.75rem;
	max-width: 32.5rem;
	margin: var(--space-6) auto var(--space-10);
}

.ph .ph-actions {
	align-self: stretch;
}

.ph-crumbs {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.ph-crumbs__divider {
	color: var(--color-line-strong);
}

/* The Angular placeholders faked the fixed save bar at the bottom of the page. */
.ph-actions {
	position: sticky;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--space-5);
	min-height: var(--space-16);
	padding: 0 var(--space-6);
	border-top: 1px solid var(--color-line);
	background: var(--color-surface);
}

.ph-actions__start {
	margin-inline-end: auto;
}
</style>
