<script setup lang="ts">
/** Port of record-view-fields/id (`IdRecordViewComponent`): an identifier (Cassandra `timeuuid`), medium weight. */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue class="id-record-view">{{ value || '—' }}</RecordViewValue>
</template>

<style scoped>
.id-record-view {
  flex-grow: 1;
  font-weight: var(--weight-medium);
}
</style>
