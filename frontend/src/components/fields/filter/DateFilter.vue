<script setup lang="ts">
/**
 * Port of filter-fields/date (`DateFilterComponent`): a native date input; emits `yyyy-MM-dd`.
 * Comparator family `datetime`, so hosts wrap it in `DefaultFilter`.
 */
import { format } from 'date-fns';
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

/** The incoming value as a local calendar date, like the Angular `format(new Date(value), …)`. */
const date = ref<string | undefined>(props.value ? format(new Date(props.value), 'yyyy-MM-dd') : undefined);

function onDateChange(value: string) {
	date.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField floating-label class="date-filter" :label="normalizedLabel" :required="required">
		<UiInput
			ref="input"
			type="date"
			:name="`${label}-${fieldKey}`"
			:model-value="date ?? null"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-date`"
			@update:model-value="onDateChange"
		/>
	</UiField>
</template>
