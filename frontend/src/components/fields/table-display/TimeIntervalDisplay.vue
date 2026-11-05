<script setup lang="ts">
/** Port of table-display-fields/time-interval (`TimeIntervalDisplayComponent`): a Postgres interval as `2d 5h 30m`. */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

interface Interval {
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
	milliseconds?: number;
}

const props = defineProps<
	TableDisplayFieldProps & {
		/** An interval object, or its JSON. Anything else is shown as is. */
		value?: string | Interval | null;
	}
>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const formattedInterval = computed(() => {
	if (!props.value) return '—';
	try {
		const interval: Interval = typeof props.value === 'string' ? JSON.parse(props.value) : props.value;
		const parts: string[] = [];
		if (interval.days) parts.push(`${interval.days}d`);
		if (interval.hours) parts.push(`${interval.hours}h`);
		if (interval.minutes) parts.push(`${interval.minutes}m`);
		if (interval.seconds) parts.push(`${interval.seconds}s`);
		if (interval.milliseconds) parts.push(`${interval.milliseconds}ms`);
		return parts.length > 0 ? parts.join(' ') : '0';
	} catch {
		return String(props.value);
	}
});
</script>

<template>
	<TableDisplayCell @copy="copy(formattedInterval)">{{ formattedInterval }}</TableDisplayCell>
</template>
