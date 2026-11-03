<script setup lang="ts">
/**
 * Port of record-view-fields/code (`CodeRecordViewComponent`): the value in a read-only Monaco
 * editor, highlighted as `widget_params.language`, without line numbers.
 */
import { computed } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

/** Angular interpolated the param, so a missing one became Monaco's unknown `"undefined"` (plain text). */
const language = computed<string>(() => widgetParams.value.language || 'plaintext');

const EDITOR_OPTIONS = { lineNumbers: 'off' } as const;
</script>

<template>
	<AppCodeEditor
		class="code-record-view"
		:model-value="value ?? ''"
		:language="language"
		:label="fieldKey || 'Code'"
		:options="EDITOR_OPTIONS"
		readonly
	/>
</template>

<style scoped>
.code-record-view {
  width: 100%;
  margin-block: var(--space-1) var(--space-5);
  resize: both;
  overflow: auto;
}
</style>
