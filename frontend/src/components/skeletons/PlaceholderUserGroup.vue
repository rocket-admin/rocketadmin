<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-user-group.
// The members of one expanded group: three full-width email lines.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading group members">
		<UiSkeleton v-for="member in 3" :key="member" decorative shape="control" height="1.25rem" />
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	width: 100%;
	margin-top: var(--space-5);
}
</style>
