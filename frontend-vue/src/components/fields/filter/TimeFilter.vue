<script setup lang="ts">
/**
 * Port of filter-fields/time (`TimeFilterComponent`): a native time input; emits the `HH:mm`
 * (or `HH:mm:ss`) string. Comparator family `datetime`, so hosts wrap it in `DefaultFilter`.
 */
import { ref, watch } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const time = ref(props.value ?? '');
watch(
	() => props.value,
	(value) => {
		time.value = value ?? '';
	},
);

function onInput(value: string) {
	time.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="time-filter" :label="normalizedLabel" :required="required">
		<UiInput
			ref="input"
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
