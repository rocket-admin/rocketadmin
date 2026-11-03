<script setup lang="ts">
/** Port of record-edit-fields/json-editor (`JsonEditorEditComponent`): a JSON column edited in Monaco. The value is shown pretty-printed (4 spaces; `{}` when undefined) and the edited text is emitted as-is, unparsed. */
import { ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: unknown }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const language = 'json';
const code = ref<string>(JSON.stringify(props.value, undefined, 4) || '{}');

function onChange(text: string) {
	code.value = text;
	emit('fieldChange', text);
}
</script>

<template>
	<div class="json-editor-edit">
		<span class="json-editor-edit__label">{{ normalizedLabel }}<span v-if="required" class="json-editor-edit__required" aria-hidden="true"> *</span></span>
		<AppCodeEditor
			class="json-editor-edit__editor"
			:model-value="code"
			:language="language"
			:readonly="readonly || disabled"
			:label="normalizedLabel || 'Code'"
			height="240px"
			@update:model-value="onChange"
		/>
	</div>
</template>

<style scoped>
.json-editor-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.json-editor-edit__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.json-editor-edit__required {
  color: var(--color-danger-strong);
}

/* Angular's box was user-resizable; Monaco relayouts itself (automaticLayout). */
.json-editor-edit__editor {
  resize: vertical;
}
</style>
