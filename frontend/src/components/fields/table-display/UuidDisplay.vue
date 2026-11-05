<script setup lang="ts">
/** Port of table-display-fields/uuid (`UuidDisplayComponent`): a UUID in a condensed face, `NULL` when empty. */
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell :copyable="Boolean(value)" copy-label="Copy UUID" @copy="copy(value)">
		<span v-if="value" class="uuid-display__value">{{ value }}</span>
		<span v-else class="uuid-display__null">NULL</span>
	</TableDisplayCell>
</template>

<style scoped>
.uuid-display__value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.uuid-display__null {
  font-style: italic;
  color: var(--color-muted);
}
</style>
