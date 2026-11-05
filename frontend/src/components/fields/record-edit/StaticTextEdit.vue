<script setup lang="ts">
/**
 * Port of record-edit-fields/static-text (`StaticTextEditComponent`): a column that can't be
 * edited (readonly widget, `null` data type) — its label and current value, or `NULL`.
 */
import type { RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();

const { normalizedLabel } = useRecordEditField(props);
</script>

<template>
	<div class="static-text">
		<span>{{ normalizedLabel }}</span>
		<span v-if="value === null" class="static-text__value">NULL</span>
		<span v-if="value" class="static-text__value">{{ value }}</span>
	</div>
</template>

<style scoped>
.static-text {
  margin-bottom: var(--space-5);
  font-size: var(--text-sm);
  color: var(--color-ink-soft);
}

.static-text__value {
  padding-inline-start: var(--space-2);
  font-style: italic;
  color: var(--color-muted);
}
</style>
