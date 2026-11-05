<script setup lang="ts">
/** Port of record-edit-fields/binary-data-caption (`BinaryDataCaptionEditComponent`): a read-only "binary data" caption. */
import type { RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: unknown }>();

const { normalizedLabel } = useRecordEditField(props);
</script>

<template>
	<div class="binary-data-caption-edit">
		<span class="binary-data-caption-edit__label">{{ normalizedLabel }}</span>
		<span class="binary-data-caption-edit__value" :data-testid="`record-${label}-binary-data-caption`">binary data</span>
	</div>
</template>

<style scoped>
.binary-data-caption-edit {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.binary-data-caption-edit__label {
  color: var(--color-ink-soft);
  font-weight: var(--weight-medium);
}

.binary-data-caption-edit__value {
  color: var(--color-muted);
  font-style: italic;
}
</style>
