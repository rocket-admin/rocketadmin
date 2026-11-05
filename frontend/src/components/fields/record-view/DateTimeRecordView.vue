<script setup lang="ts">
/** Port of record-view-fields/date-time (`DateTimeRecordViewComponent`): date and time (date-fns `P p`). */
import { format } from 'date-fns';
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | number | null }>();
defineEmits<ViewFieldEmits>();

/** Unparseable values are shown as stored. */
const formattedDateTime = computed(() => {
	if (!props.value) return '';
	const date = new Date(props.value);
	return Number.isNaN(date.getTime()) ? String(props.value) : format(date, 'P p');
});
</script>

<template>
	<RecordViewValue>{{ formattedDateTime || '—' }}</RecordViewValue>
</template>
