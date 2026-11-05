<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-company-invitation.
// The invitation form: a title, two label + field pairs split by a divider, and a submit button.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading invitation">
		<UiSkeleton decorative shape="control" height="2rem" class="ph__title" />
		<UiSkeleton decorative shape="control" width="7.5rem" height="1.5rem" class="ph__label" />
		<UiSkeleton decorative shape="control" height="2.75rem" />
		<hr class="ph__divider">
		<UiSkeleton decorative shape="control" width="7.5rem" height="1.5rem" class="ph__label" />
		<UiSkeleton decorative shape="control" height="2.75rem" />
		<UiSkeleton decorative shape="control" width="4rem" height="2.25rem" class="ph__button" />
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	flex-direction: column;
	justify-content: center;
	width: 90%;
	min-width: 18.75rem;
	max-width: 32.5rem;
	height: 100%;
	margin: 0 auto;
	padding: var(--space-4);
}

.ph__title {
	margin-bottom: var(--space-8);
}

.ph__label {
	margin-bottom: var(--space-4);
}

.ph__divider {
	width: 100%;
	margin: var(--space-12) 0 var(--space-5);
	border: none;
	border-top: 1px solid var(--color-line);
}

.ph__button {
	margin-top: var(--space-4);
	margin-inline-start: auto;
}
</style>
