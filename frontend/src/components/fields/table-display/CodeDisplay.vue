<script setup lang="ts">
/** Port of table-display-fields/code (`CodeDisplayComponent`): source code shown as a monospace chip. */
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);
</script>

<template>
	<TableDisplayCell @copy="copy(value)">
		<code class="code-display__value">{{ value || '—' }}</code>
	</TableDisplayCell>
</template>

<style scoped>
.code-display__value {
  padding: 0 var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
