<script setup lang="ts">
/** Port of table-display-fields/time (`TimeDisplayComponent`): a time string as is, a timestamp as `HH:mm:ss`. */
import { format } from 'date-fns';
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const formattedTime = computed(() => {
	const value = props.value;
	if (!value) return null;
	if (String(value).includes(':')) return value;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : format(date, 'HH:mm:ss');
});
</script>

<template>
	<TableDisplayCell @copy="copy(formattedTime)">{{ formattedTime || '—' }}</TableDisplayCell>
</template>
