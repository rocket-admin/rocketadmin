<script setup lang="ts">
/** Port of table-display-fields/file (`FileDisplayComponent`): a file column, captioned "Binary Data" unless short text. */
import { computed } from 'vue';
import type { TableDisplayFieldProps } from '../types';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | { type: string; data: unknown[] } | null }>();

const isBlob = computed(
	() => typeof props.value === 'object' && props.value !== null && 'type' in props.value && 'data' in props.value,
);

const displayText = computed(() => {
	if (isBlob.value) return 'Binary Data';
	if (typeof props.value === 'string' && props.value.length > 20) return 'Binary Data';
	return props.value ? String(props.value) : '—';
});
</script>

<template>
	<TableDisplayCell :copyable="false">
		<span class="file-display__value">{{ displayText }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.file-display__value {
  font-style: italic;
  color: var(--color-muted);
}
</style>
