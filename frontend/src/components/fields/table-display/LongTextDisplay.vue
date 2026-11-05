<script setup lang="ts">
/** Port of table-display-fields/long-text (`LongTextDisplayComponent`): a textarea column's one-line cell. */
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell class="long-text-display" @copy="copy(value)">{{ value || '—' }}</TableDisplayCell>
</template>

<style scoped>
.long-text-display {
  height: var(--space-10);
}
</style>
