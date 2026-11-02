<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-connection-settings.
// A two-column form (logo + field across the top, then full-width and half-width fields) over the
// fixed save bar.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading connection settings">
		<div class="ph__form">
			<div class="ph__line ph__full">
				<UiSkeleton decorative shape="circle" width="1.5rem" height="1.5rem" />
				<UiSkeleton decorative shape="control" height="2.75rem" class="ph__grow" />
			</div>
			<UiSkeleton decorative shape="control" height="2.75rem" class="ph__full" />
			<UiSkeleton decorative shape="control" height="2.75rem" />
			<UiSkeleton decorative shape="control" height="2.75rem" />
			<UiSkeleton decorative shape="control" height="2.75rem" class="ph__full" />
		</div>
		<div class="ph-actions">
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" class="ph-actions__start" />
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" />
		</div>
	</div>
</template>

<style scoped>
/* Mirrors ConnectionSettingsView's layout: it fills the page so the save bar sits at the bottom. */
.ph {
	display: flex;
	flex: 1;
	flex-direction: column;
}

.ph__form {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--space-5);
	margin: 0 auto var(--space-10);
}

.ph__line {
	display: flex;
	align-items: center;
	gap: var(--space-5);
}

.ph__full {
	grid-column: 1 / -1;
}

.ph__grow {
	flex: 1;
}

/* Bleeds through the page's --settings-gutter to its edges, with the buttons aligned to the form. */
.ph-actions {
	position: sticky;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--space-2);
	margin: auto calc(-1 * var(--settings-gutter)) 0;
	padding: var(--space-3) var(--settings-gutter);
	border-top: 1px solid var(--color-line);
	background: var(--color-surface);
}

.ph-actions__start {
	margin-inline-end: auto;
}
</style>
