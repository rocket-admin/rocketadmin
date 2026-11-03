<script setup lang="ts">
// The table view's mobile bottom sheets (table switcher, sort, columns, import/export): a panel
// sliding up from the bottom edge over a backdrop, with a title and a close button. Escape and the
// backdrop close it.
import { onBeforeUnmount, onMounted } from 'vue';
import { UiIconButton } from '@/components/ui';

defineProps<{
	/** Heading and accessible name. */
	title: string;
}>();

const emit = defineEmits<{ close: [] }>();

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
	<div class="table-sheet__backdrop" @click="emit('close')" />
	<div class="table-sheet" role="dialog" :aria-label="title">
		<div class="table-sheet__handle" aria-hidden="true" />
		<div class="table-sheet__header">
			<span class="table-sheet__title">{{ title }}</span>
			<UiIconButton icon="close" label="Close" @click="emit('close')" />
		</div>
		<slot name="header" />
		<div class="table-sheet__list">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.table-sheet__backdrop {
	position: fixed;
	inset: 0;
	z-index: var(--z-overlay);
	background: var(--color-overlay);
}

.table-sheet {
	position: fixed;
	inset: auto 0 0;
	z-index: var(--z-modal);
	display: flex;
	flex-direction: column;
	max-height: 80vh;
	padding-bottom: env(safe-area-inset-bottom, 0);
	border-radius: var(--radius-panel) var(--radius-panel) 0 0;
	background: var(--color-surface);
	box-shadow: var(--shadow-lift);
}

.table-sheet__handle {
	width: 2.25rem;
	height: 4px;
	margin: var(--space-2) auto 0;
	border-radius: var(--radius-pill);
	background: var(--color-line-strong);
}

.table-sheet__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--space-2) var(--space-2) var(--space-2) var(--space-5);
}

.table-sheet__title {
	font-size: var(--text-md);
	font-weight: var(--weight-semibold);
}

.table-sheet__list {
	flex: 1;
	overflow-y: auto;
	padding: 0 0 var(--space-4);
}
</style>
