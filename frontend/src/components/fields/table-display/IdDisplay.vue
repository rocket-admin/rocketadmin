<script setup lang="ts">
/** Port of table-display-fields/id (`IdDisplayComponent`): a right-aligned identifier. */
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | number | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell align="end" @copy="copy(value)">
		<span class="id-display__value">{{ value || '—' }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.id-display__value {
  font-weight: var(--weight-medium);
}
</style>
