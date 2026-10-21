<script setup lang="ts">
// Port of ViewAsBannerComponent: shown while an admin previews the app as one of their groups.
import { computed } from 'vue';
import { UiButton, UiIcon } from '@/components/ui';
import { useUsersStore } from '@/stores/users';
import { useViewAsStore } from '@/stores/view-as';

const viewAs = useViewAsStore();
const users = useUsersStore();

const groupLabel = computed(() => {
	const id = viewAs.viewAsGroupId;
	if (!id) return '';
	const match = users.groups.find((info) => info.group.id === id);
	if (match) return match.group.title;
	// The group list is not loaded for this connection: fall back to a truncated id.
	return id.length > 8 ? `${id.slice(0, 8)}…` : id;
});
</script>

<template>
	<div v-if="viewAs.isActive" class="view-as-banner" role="status" aria-live="polite">
		<UiIcon name="visibility" size="sm" class="view-as-banner__icon" />
		<span class="view-as-banner__text">
			Viewing as group <strong>{{ groupLabel }}</strong>
		</span>
		<UiButton variant="secondary" size="sm" @click="viewAs.clearViewAs()">Exit view mode</UiButton>
	</div>
</template>

<style scoped>
.view-as-banner {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-3);
	padding: var(--space-2) var(--space-4);
	border-bottom: 1px solid var(--color-warning-border);
	background: var(--color-warning-bg);
	color: var(--color-warning);
	font-size: var(--text-sm);
}

.view-as-banner__text strong {
	font-weight: var(--weight-semibold);
}
</style>
