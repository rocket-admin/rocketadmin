<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-connections.
// Three connection cards in a row (stacked on narrow screens) and the "Add database" pill below.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading connections">
		<div class="ph__cards">
			<UiSkeleton v-for="card in 3" :key="card" decorative shape="block" height="9.25rem" class="ph__card" />
		</div>
		<UiSkeleton decorative width="11.125rem" height="3rem" class="ph__add" />
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	flex-direction: column;
}

.ph__cards {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--space-5);
}

.ph__card {
	flex: 0 0 calc((100% - 2 * var(--space-5)) / 3);
}

.ph__add {
	align-self: flex-end;
	margin: var(--space-8) 0;
}

@media (width <= 600px) {
	.ph__cards {
		flex-direction: column;
	}

	.ph__card {
		flex: initial;
	}
}
</style>
