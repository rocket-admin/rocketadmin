<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-table-widgets.
// The widgets page: breadcrumbs, then two rows of five widget fields plus a round info icon, over
// the save bar.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiIcon, UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading widgets">
		<div class="ph-crumbs">
			<UiSkeleton decorative shape="control" width="7.5rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="10.75rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
		</div>
		<div class="ph__widgets">
			<template v-for="widgetRow in 2" :key="widgetRow">
				<UiSkeleton v-for="cell in 5" :key="cell" decorative shape="control" height="2.75rem" />
				<UiSkeleton decorative shape="circle" width="1.5rem" height="1.5rem" />
			</template>
		</div>
		<div class="ph-actions">
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" class="ph-actions__start" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
		</div>
	</div>
</template>

<style scoped>
.ph {
	width: 90%;
	min-width: 18.75rem;
	margin: 0 auto var(--space-4);
}

.ph .ph-crumbs {
	margin: var(--space-8) 0 var(--space-6);
}

.ph__widgets {
	display: grid;
	grid-template-columns: minmax(10%, 8.125rem) 1fr 2fr 1fr 2fr 3.125rem;
	align-items: start;
	gap: var(--space-4) var(--space-5);
	margin-bottom: var(--space-10);
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
