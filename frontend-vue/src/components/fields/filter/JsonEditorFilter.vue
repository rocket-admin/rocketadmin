<script setup lang="ts">
/**
 * Port of filter-fields/json-editor (`JsonEditorFilterComponent`): a Monaco JSON editor seeded with
 * the value pretty-printed (4 spaces, `{}` for undefined); emits the editor text as typed.
 */
import { ref } from 'vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';

const props = defineProps<FilterFieldProps & { value?: unknown }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

/** `JSON.stringify(value, undefined, 4) || '{}'` — so `null` stays `"null"`, only undefined falls back. */
const code = ref(JSON.stringify(props.value, undefined, 4) || '{}');

function onChange(value: string) {
	code.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<div class="json-editor-filter">
		<span class="json-editor-filter__label">{{ normalizedLabel }} {{ required ? '*' : '' }}</span>
		<AppCodeEditor
			:model-value="code"
			language="json"
			:label="normalizedLabel || 'JSON'"
			:readonly="readonly"
			@update:model-value="onChange"
		/>
	</div>
</template>

<style scoped>
.json-editor-filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.json-editor-filter__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}
</style>
