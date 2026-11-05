<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-dashboards.
// Six dashboard cards in an auto-fill grid: preview area, title, description and a meta row.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading dashboards">
		<div v-for="card in 6" :key="card" class="ph__card">
			<UiSkeleton decorative shape="block" height="10rem" />
			<div class="ph__content">
				<UiSkeleton decorative shape="control" width="60%" height="1.25rem" />
				<UiSkeleton decorative shape="control" width="80%" height="1rem" />
				<div class="ph__meta">
					<UiSkeleton decorative shape="control" width="5rem" height="0.875rem" />
					<UiSkeleton decorative shape="control" width="3.75rem" height="0.875rem" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.ph {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
	gap: var(--space-6);
}

.ph__card {
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.ph__content {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	padding: var(--space-4);
}

.ph__meta {
	display: flex;
	justify-content: space-between;
	margin-top: var(--space-1);
}

@media (width <= 600px) {
	.ph {
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}
}
</style>
