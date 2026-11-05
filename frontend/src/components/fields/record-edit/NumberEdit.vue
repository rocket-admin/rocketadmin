<script setup lang="ts">
/** Port of record-edit-fields/number (`NumberEditComponent`): a numeric column. */
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: number | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const text = ref(props.value == null ? '' : String(props.value));

/** Angular's `NumberValueAccessor`: an emptied input is `null`, anything else is `parseFloat`ed. */
function onInput(value: string) {
	text.value = value;
	emit('fieldChange', value === '' ? null : parseFloat(value));
}
</script>

<template>
	<UiField class="number-edit" :label="normalizedLabel" :required="required">
		<UiInput
			type="number"
			:name="`${label}-${fieldKey}`"
			:model-value="text"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-number`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
