<script setup lang="ts">
/** Port of record-edit-fields/time (`TimeEditComponent`): a `time` column as a native time picker. */
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const time = ref(props.value ?? '');

function onInput(value: string) {
	time.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="time-edit" :label="normalizedLabel" :required="required">
		<UiInput
			type="time"
			:name="`${label}-${fieldKey}`"
			:model-value="time"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-time`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
