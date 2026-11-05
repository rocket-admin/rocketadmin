<script setup lang="ts">
/** Port of table-display-fields/static-text (`StaticTextDisplayComponent`): a read-only column's cell. */
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | number | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell @copy="copy(value)">{{ value || '—' }}</TableDisplayCell>
</template>
