<script setup lang="ts">
/** Port of record-edit-fields/markdown (`MarkdownEditComponent`): Markdown source edited in Monaco. */
import { ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const language = 'markdown';
const code = ref<string>(props.value ?? '');

function onChange(text: string) {
	code.value = text;
	emit('fieldChange', text);
}
</script>

<template>
	<div class="markdown-edit">
		<span class="markdown-edit__label">{{ normalizedLabel }}<span v-if="required" class="markdown-edit__required" aria-hidden="true"> *</span></span>
		<AppCodeEditor
			class="markdown-edit__editor"
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
.markdown-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.markdown-edit__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.markdown-edit__required {
  color: var(--color-danger-strong);
}

/* Angular's box was user-resizable; Monaco relayouts itself (automaticLayout). */
.markdown-edit__editor {
  resize: vertical;
}
</style>
