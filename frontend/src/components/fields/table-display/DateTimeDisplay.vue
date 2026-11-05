<script setup lang="ts">
/**
 * Port of table-display-fields/date-time (`DateTimeDisplayComponent`): a timestamp, shown relative
 * ("5 minutes ago") within `formatDistanceWithinHours` (default 0 = never), the full one as a tooltip.
 */
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const formatDistanceWithinHours = computed(() =>
	widgetParams.value.formatDistanceWithinHours !== undefined
		? Number(widgetParams.value.formatDistanceWithinHours) || 0
		: 0,
);

const display = computed(() => {
	if (!props.value) return { formatted: null, full: null };
	const date = new Date(props.value);
	if (Number.isNaN(date.getTime())) return { formatted: props.value, full: props.value };
	const full = format(date, 'PPpp');
	const hours = formatDistanceWithinHours.value;
	if (hours > 0 && Math.abs(differenceInHours(date, new Date())) <= hours) {
		return { formatted: formatDistanceToNow(date, { addSuffix: true }), full };
	}
	return { formatted: format(date, 'P p'), full };
});
</script>

<template>
	<TableDisplayCell @copy="copy(display.formatted)">
		<span :title="display.full || undefined">{{ display.formatted || '—' }}</span>
	</TableDisplayCell>
</template>
