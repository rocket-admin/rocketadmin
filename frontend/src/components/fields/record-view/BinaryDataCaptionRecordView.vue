<script setup lang="ts">
/**
 * Port of record-view-fields/binary-data-caption (`BinaryDataCaptionRecordViewComponent`): the
 * caption shown in place of binary data the panel does not decode.
 */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';

defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<div class="binary-data-caption-record-view">
		<span class="binary-data-caption-record-view__value">{{ value || '—' }}</span>
	</div>
</template>

<style scoped>
.binary-data-caption-record-view__value {
  color: var(--color-muted);
  font-style: italic;
}
</style>
