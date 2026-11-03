<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-add-user-dialog.
// A field, two lines of text and a two-button action row: the add-user dialog body.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading">
		<div class="ph__form">
			<UiSkeleton decorative shape="control" height="2.75rem" />
			<UiSkeleton decorative width="80%" height="1.25rem" />
			<UiSkeleton decorative width="80%" height="1.25rem" />
		</div>
		<div class="ph__actions">
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" />
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" />
		</div>
	</div>
</template>

<style scoped>
.ph__form {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	padding: var(--space-5) var(--space-6);
}

.ph__actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--space-3);
	padding: var(--space-2);
}
</style>
