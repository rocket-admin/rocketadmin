<script setup lang="ts">
/**
 * Port of filter-fields/number (`NumberFilterComponent`): a numeric filter value.
 * Comparator family `number`, so hosts wrap it in `DefaultFilter`.
 */
import { ref, watch } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: number | string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const number = ref(props.value ?? null);
watch(
	() => props.value,
	(value) => {
		number.value = value ?? null;
	},
);

/** Angular's `NumberValueAccessor`: an empty input is `null`, anything else goes through parseFloat. */
function onInput(value: string) {
	const parsed = value === '' ? null : Number.parseFloat(value);
	number.value = parsed;
	emit('fieldChange', parsed);
}
</script>

<template>
	<UiField class="number-filter" :label="normalizedLabel" :required="required">
		<UiInput
			ref="input"
			type="number"
			:name="`${label}-${fieldKey}`"
			:model-value="number"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-number`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
