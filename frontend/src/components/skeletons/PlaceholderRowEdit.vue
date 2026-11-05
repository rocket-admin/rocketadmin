<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-row-edit.
// The row-edit page: the header (back button, title and table name, row actions), five fields in a
// centred column, and the full-width save bar pinned to the bottom with its buttons aligned to the
// column.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading row">
		<div class="ph-header">
			<div class="ph-header__main">
				<UiSkeleton decorative shape="circle" width="2.5rem" height="2.5rem" />
				<div class="ph-header__text">
					<UiSkeleton decorative shape="line" width="8rem" height="1.1rem" />
					<UiSkeleton decorative shape="line" width="5rem" height="0.75rem" />
				</div>
			</div>
			<div class="ph-header__actions">
				<UiSkeleton decorative shape="circle" width="2.5rem" height="2.5rem" />
				<UiSkeleton decorative shape="circle" width="2.5rem" height="2.5rem" />
			</div>
		</div>
		<div class="ph__form">
			<UiSkeleton v-for="field in 5" :key="field" decorative shape="control" height="2.75rem" />
		</div>
		<div class="ph-actions">
			<div class="ph-actions__inner">
				<UiSkeleton decorative shape="control" width="8rem" height="2.25rem" class="ph-actions__start" />
				<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Mirrors RowEditView's layout: it fills the page so the save bar sits at the bottom. */
.ph {
	display: flex;
	flex: 1;
	flex-direction: column;
}

.ph-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	width: 100%;
	max-width: 32.5rem;
	margin: 0 auto;
}

.ph-header__main,
.ph-header__actions {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.ph-header__text {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
}

.ph__form {
	display: flex;
	flex: 1 0 auto;
	flex-direction: column;
	gap: var(--space-4);
	width: 100%;
	min-width: 18.75rem;
	max-width: 32.5rem;
	margin: var(--space-6) auto 0;
	padding-bottom: var(--space-10);
}

.ph-actions {
	position: sticky;
	bottom: 0;
	margin: 0 calc(-1 * var(--space-4));
	padding: var(--space-3) var(--space-4);
	border-top: 1px solid var(--color-line);
	background: var(--color-surface);
}

.ph-actions__inner {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--space-2);
	max-width: 32.5rem;
	margin: 0 auto;
}

.ph-actions__start {
	margin-inline-end: auto;
}
</style>
