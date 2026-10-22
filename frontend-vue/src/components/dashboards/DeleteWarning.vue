<script setup lang="ts">
// The warning body shared by the panel, saved-query and dashboard delete dialogs: a warning icon,
// the question (default slot) and what deleting removes.
import { UiIcon } from '@/components/ui';

defineProps<{
	/** What the delete removes, shown muted under the question. */
	details: string;
}>();
</script>

<template>
	<div class="delete-warning">
		<UiIcon name="warning" size="lg" class="delete-warning__icon" />
		<div>
			<p class="delete-warning__text"><slot /></p>
			<p class="delete-warning__details">{{ details }}</p>
		</div>
	</div>
</template>

<style scoped>
.delete-warning {
	display: flex;
	align-items: flex-start;
	gap: var(--space-4);
}

.delete-warning__icon {
	flex-shrink: 0;
	color: var(--color-warning);
}

.delete-warning__text {
	margin: 0 0 var(--space-2);
}

.delete-warning__details {
	margin: 0;
	font-size: var(--text-sm);
	color: var(--color-muted);
}
</style>
