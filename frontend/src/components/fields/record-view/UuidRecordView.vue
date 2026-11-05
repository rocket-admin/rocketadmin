<script setup lang="ts">
/** Port of record-view-fields/uuid (`UuidRecordViewComponent`): a UUID on one line, `Null` when empty. */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue class="uuid-record-view">{{ value || 'Null' }}</RecordViewValue>
</template>

<style scoped>
.uuid-record-view {
  display: block;
  overflow: hidden;
  font-family: var(--font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
