<script setup lang="ts">
/**
 * Port of record-view-fields/time-interval (`TimeIntervalRecordViewComponent`): a Postgres interval
 * object (or its JSON) as `1d 2h 30m 5s 10ms`; `0` for an empty interval, the raw value when unparseable.
 */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();

const UNITS = [
	['days', 'd'],
	['hours', 'h'],
	['minutes', 'm'],
	['seconds', 's'],
	['milliseconds', 'ms'],
] as const;

const formattedInterval = computed(() => {
	if (!props.value) return '—';
	try {
		const interval: unknown = typeof props.value === 'string' ? JSON.parse(props.value) : props.value;
		const record = (interval ?? {}) as Record<string, unknown>;
		const parts = UNITS.filter(([key]) => record[key]).map(([key, suffix]) => `${record[key]}${suffix}`);
		return parts.length > 0 ? parts.join(' ') : '0';
	} catch {
		return String(props.value);
	}
});
</script>

<template>
	<RecordViewValue>{{ formattedInterval }}</RecordViewValue>
</template>
