<script setup lang="ts">
/** Port of table-display-fields/json-editor (`JsonEditorDisplayComponent`): a JSON value as a monospace one-liner. */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<
	TableDisplayFieldProps & {
		/** A JSON string or an already-parsed value (json/jsonb/array/object columns). */
		value?: unknown;
	}
>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const formattedJson = computed(() => {
	if (!props.value) return '';
	try {
		const parsed = typeof props.value === 'string' ? JSON.parse(props.value) : props.value;
		return JSON.stringify(parsed, null, 2);
	} catch {
		return String(props.value);
	}
});

/** What the copy button copies: the raw value, stringified when the API handed over an object. */
const copyText = computed(() => (typeof props.value === 'string' ? props.value : JSON.stringify(props.value)));
</script>

<template>
	<TableDisplayCell v-if="value" @copy="copy(copyText)">
		<code class="json-editor-display__value">{{ formattedJson }}</code>
	</TableDisplayCell>
</template>

<style scoped>
.json-editor-display__value {
  padding: 0 var(--space-2);
  border-radius: var(--radius-control);
  background: var(--color-paper-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
