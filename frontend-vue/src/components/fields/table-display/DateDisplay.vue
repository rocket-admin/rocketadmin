<script setup lang="ts">
/**
 * Port of table-display-fields/date (`DateDisplayComponent`): a date, shown relative ("today",
 * "2 days ago") within `formatDistanceWithinHours` (default 48) of now, the full date as a tooltip.
 */
import { differenceInHours, format, formatDistanceStrict, isToday, startOfToday } from 'date-fns';
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const formatDistanceWithinHours = computed(() =>
	widgetParams.value.formatDistanceWithinHours !== undefined
		? Number(widgetParams.value.formatDistanceWithinHours) || 48
		: 48,
);

/** `{ formatted, full }`, or nulls for an empty value. */
const display = computed(() => {
	if (!props.value) return { formatted: null, full: null };
	const date = new Date(props.value);
	if (Number.isNaN(date.getTime())) return { formatted: props.value, full: props.value };
	const full = format(date, 'PPP');
	const hours = formatDistanceWithinHours.value;
	if (hours > 0 && Math.abs(differenceInHours(date, new Date())) <= hours) {
		return {
			formatted: isToday(date) ? 'today' : formatDistanceStrict(date, startOfToday(), { addSuffix: true }),
			full,
		};
	}
	return { formatted: format(date, 'P'), full };
});
</script>

<template>
	<TableDisplayCell @copy="copy(display.formatted)">
		<span :title="display.full || undefined">{{ display.formatted || '—' }}</span>
	</TableDisplayCell>
</template>
