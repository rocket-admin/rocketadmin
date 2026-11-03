<script setup lang="ts">
/** Port of record-edit-fields/code (`CodeEditComponent`): source code in the language named by `widget_params.language`, edited in Monaco. */
import { computed, ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const language = computed(() => String(widgetParams.value.language || 'plaintext'));
const code = ref<string>(props.value ?? '');

function onChange(text: string) {
	code.value = text;
	emit('fieldChange', text);
}
</script>

<template>
	<div class="code-edit">
		<span class="code-edit__label">{{ normalizedLabel }}<span v-if="required" class="code-edit__required" aria-hidden="true"> *</span></span>
		<AppCodeEditor
			class="code-edit__editor"
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
.code-edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.code-edit__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.code-edit__required {
  color: var(--color-danger-strong);
}

/* Angular's box was user-resizable; Monaco relayouts itself (automaticLayout). */
.code-edit__editor {
  resize: vertical;
}
</style>
