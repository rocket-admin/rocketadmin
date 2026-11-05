<script setup lang="ts">
/**
 * Port of record-view-fields/json-editor (`JsonEditorRecordViewComponent`): JSON in a read-only
 * Monaco editor, without line numbers.
 *
 * Unlike Angular, which handed the raw value to the editor, a parsed object/array (json/jsonb,
 * Mongo `object`, arrays…) is pretty-printed with 4-space indent first, as the JSON edit widget does;
 * a string is shown as stored.
 */
import { computed } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
defineEmits<ViewFieldEmits>();

const text = computed(() => {
	const value = props.value;
	if (value == null) return '';
	if (typeof value === 'string') return value;
	return JSON.stringify(value, null, 4);
});

const EDITOR_OPTIONS = { lineNumbers: 'off' } as const;
</script>

<template>
	<AppCodeEditor
		class="json-editor-record-view"
		:model-value="text"
		language="json"
		:label="fieldKey || 'JSON'"
		:options="EDITOR_OPTIONS"
		readonly
	/>
</template>

<style scoped>
.json-editor-record-view {
  width: 100%;
  margin-block: var(--space-1) var(--space-5);
  resize: both;
  overflow: auto;
}
</style>
