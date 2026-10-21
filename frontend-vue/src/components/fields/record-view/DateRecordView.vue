<script setup lang="ts">
/** Port of record-view-fields/date (`DateRecordViewComponent`): a date in the locale's short format (date-fns `P`). */
import { format } from 'date-fns';
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | number | null }>();
defineEmits<ViewFieldEmits>();

/** Unparseable values are shown as stored. */
const formattedDate = computed(() => {
	if (!props.value) return '';
	const date = new Date(props.value);
	return Number.isNaN(date.getTime()) ? String(props.value) : format(date, 'P');
});
</script>

<template>
	<RecordViewValue>{{ formattedDate || '—' }}</RecordViewValue>
</template>
