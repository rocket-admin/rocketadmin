<script setup lang="ts">
/**
 * Port of filter-fields/text (`TextFilterComponent`): a single-line text filter value.
 * Comparator family `text` (see `comparatorType.ts`), so hosts wrap it in `DefaultFilter`.
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

// `[(ngModel)]="value"`: the control follows the input, so a host reset (DefaultFilter's "is empty")
// clears it.
const text = ref(props.value ?? '');
watch(
	() => props.value,
	(value) => {
		text.value = value ?? '';
	},
);

function onInput(value: string) {
	text.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="text-filter" :label="normalizedLabel" :required="required">
		<UiInput
			ref="input"
			type="text"
			:name="`${label}-${fieldKey}`"
			:model-value="text"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-text`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
