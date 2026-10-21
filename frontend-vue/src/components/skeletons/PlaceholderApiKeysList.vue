<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-api-keys-list.
// Three list rows: an icon and a title on the start side, a round action button on the end.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading API keys">
		<div v-for="row in 3" :key="row" class="ph__item">
			<div class="ph__info">
				<UiSkeleton decorative shape="control" width="1.5rem" height="1.5rem" />
				<UiSkeleton decorative shape="control" width="10rem" height="1.25rem" />
			</div>
			<UiSkeleton decorative shape="circle" width="2rem" height="2rem" />
		</div>
	</div>
</template>

<style scoped>
.ph__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--space-10);
	padding: var(--space-1) var(--space-4);
}

.ph__info {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}
</style>
