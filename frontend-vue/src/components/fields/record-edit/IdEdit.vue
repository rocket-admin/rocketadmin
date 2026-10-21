<script setup lang="ts">
/** Port of record-edit-fields/id (`IdEditComponent`): an identifier column, validated as a GUID/UUID. */
import { computed, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

/** Angular's `pattern` attribute, kept on the input so the host form sees it too. */
const ID_PATTERN = '^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$';
const ID_REGEX = new RegExp(ID_PATTERN);

const id = ref(props.value ?? '');
const dirty = ref(false);

const error = computed(() =>
	dirty.value && id.value && !ID_REGEX.test(id.value) ? "Value doesn't match pattern." : undefined,
);

function onInput(value: string) {
	id.value = value;
	dirty.value = true;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="id-edit" :label="normalizedLabel" :required="required" :error="error">
		<UiInput
			:name="`${label}-${fieldKey}`"
			:model-value="id"
			:pattern="ID_PATTERN"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-id`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
