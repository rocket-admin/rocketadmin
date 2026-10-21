<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-company.
// The company page: title, name field, plan line with button, members heading with invite button,
// then the members table.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
import PlaceholderTableData from './PlaceholderTableData.vue';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading company">
		<UiSkeleton decorative shape="control" width="min(20.75rem, 100%)" height="2rem" class="ph__title" />
		<UiSkeleton decorative shape="control" height="2.75rem" />
		<div class="ph__line">
			<UiSkeleton decorative shape="control" width="7.5rem" height="1.5rem" />
			<UiSkeleton decorative shape="control" width="11.875rem" height="2.25rem" />
		</div>
		<div class="ph__line ph__line--invite">
			<UiSkeleton decorative shape="control" width="8.875rem" height="2rem" />
			<UiSkeleton decorative shape="control" width="9.5rem" height="2.25rem" />
		</div>
		<PlaceholderTableData nested />
	</div>
</template>

<style scoped>
.ph {
	width: 100%;
	max-width: 75rem;
	margin: var(--space-8) auto;
	padding: 0 clamp(var(--space-10), 5vw, 6.25rem);
}

.ph__title {
	margin-bottom: var(--space-8);
}

.ph__line {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: var(--space-2) 0;
}

.ph__line--invite {
	margin-bottom: var(--space-4);
}

@media (width <= 600px) {
	.ph {
		padding: var(--space-0) 9vw;
	}
}
</style>
