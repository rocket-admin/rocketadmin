<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-table-settings.
// The table-settings page: breadcrumbs, a heading, a field with an add button, then ten field + hint
// pairs, over the save bar with three buttons.
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton, so the
// screen announces once (see UiSkeleton's header).
import { UiIcon, UiSkeleton } from '@/components/ui';
</script>

<template>
	<div class="ph" role="status" aria-label="Loading table settings">
		<div class="ph-crumbs">
			<UiSkeleton decorative shape="control" width="7.5rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="10.75rem" height="2.25rem" />
			<UiIcon name="chevron_right" class="ph-crumbs__divider" />
			<UiSkeleton decorative shape="control" width="5rem" height="2.25rem" />
		</div>
		<div class="ph__form">
			<UiSkeleton decorative shape="control" width="8.875rem" height="2rem" class="ph__heading" />
			<div class="ph__line">
				<UiSkeleton decorative shape="control" height="2.75rem" class="ph__field ph__grow" />
				<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" class="ph__add" />
			</div>
			<template v-for="field in 10" :key="field">
				<UiSkeleton decorative shape="control" height="2.75rem" class="ph__field" />
				<UiSkeleton decorative shape="control" width="63%" height="1rem" class="ph__info" />
			</template>
		</div>
		<div class="ph-actions">
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" class="ph-actions__start" />
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" />
			<UiSkeleton decorative shape="control" width="4.5rem" height="2.25rem" />
		</div>
	</div>
</template>

<style scoped>
.ph {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--space-8) 0 0;
}

.ph__form {
	display: flex;
	flex-direction: column;
	width: 100%;
	margin: var(--space-6) auto var(--space-10);
	padding: var(--space-0) max(calc(50vw - 20.3rem), 10%);
}

.ph__heading {
	margin-top: var(--space-5);
}

.ph__line {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.ph__grow {
	flex: 1;
}

.ph__field {
	margin-top: var(--space-5);
}

.ph__info {
	margin-top: var(--space-1);
}

.ph__add {
	margin-top: var(--space-5);
}

.ph .ph-actions {
	align-self: stretch;
}

@media (width <= 600px) {
	.ph {
		padding: var(--space-8) 9vw 0;
	}

	.ph__form {
		padding: 0;
	}
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
