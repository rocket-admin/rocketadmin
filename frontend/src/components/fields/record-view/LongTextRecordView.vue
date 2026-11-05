<script setup lang="ts">
/** Port of record-view-fields/long-text (`LongTextRecordViewComponent`): multi-line text, line breaks kept. */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue>{{ value || '—' }}</RecordViewValue>
</template>
