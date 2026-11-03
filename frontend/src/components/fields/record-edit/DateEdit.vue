<script setup lang="ts">
/** Port of record-edit-fields/date (`DateEditComponent`): a date column, emitted as `yyyy-MM-dd`. */
import { format } from 'date-fns';
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

/** The stored value (any date or datetime string) reduced to the input's `yyyy-MM-dd`. */
const date = ref(props.value ? format(new Date(props.value), 'yyyy-MM-dd') : '');

function onInput(value: string) {
	date.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="date-edit" :label="normalizedLabel" :required="required">
		<UiInput
			type="date"
			:name="`${label}-${fieldKey}`"
			:model-value="date"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-date`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
