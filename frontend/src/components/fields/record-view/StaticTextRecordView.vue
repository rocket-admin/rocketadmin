<script setup lang="ts">
/** Port of record-view-fields/static-text (`StaticTextRecordViewComponent`): the `Readonly` widget's value. */
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();
</script>

<template>
	<RecordViewValue>{{ value || '—' }}</RecordViewValue>
</template>
