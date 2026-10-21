<script setup lang="ts">
/**
 * Port of record-view-fields/time (`TimeRecordViewComponent`): a time string (`14:30:00`) as
 * stored; anything else that parses as a date is shown as `HH:mm:ss`.
 */
import { format } from 'date-fns';
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | number | null }>();
defineEmits<ViewFieldEmits>();

const formattedTime = computed(() => {
	if (!props.value) return '';
	const value = String(props.value);
	if (value.includes(':')) return value;
	const date = new Date(props.value);
	return Number.isNaN(date.getTime()) ? value : format(date, 'HH:mm:ss');
});
</script>

<template>
	<RecordViewValue>{{ formattedTime || '—' }}</RecordViewValue>
</template>
