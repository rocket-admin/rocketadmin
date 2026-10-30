<script setup lang="ts">
/**
 * Port of filter-fields/select (`SelectFilterComponent`): a multiple select over the enum values
 * (widget `options`, else the column's `data_type_params`), with an empty null option for nullable
 * columns. One picked value filters `eq` with that value, several filter `in` with the array,
 * none emits `undefined`. Emits `comparatorChange('eq')` on mount.
 */
import { computed, onMounted, ref } from 'vue';
import { type SelectOption, UiField, UiSelect } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type OptionValue = string | null;

const props = defineProps<FilterFieldProps & { value?: OptionValue | OptionValue[] }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const NULL_OPTION: SelectOption<OptionValue> = { value: null, label: '' };

const options = computed<SelectOption<OptionValue>[]>(() => {
	if (props.widgetStructure) {
		const fromWidget: SelectOption<OptionValue>[] = Array.isArray(widgetParams.value.options)
			? widgetParams.value.options
			: [];
		return widgetParams.value.allow_null ? [NULL_OPTION, ...fromWidget] : fromWidget;
	}
	if (props.structure) {
		const fromType = (props.structure.data_type_params ?? []).map((option) => ({ value: option, label: option }));
		return props.structure.allow_null ? [NULL_OPTION, ...fromType] : fromType;
	}
	return [];
});

const selectedValues = ref<OptionValue[]>(
	Array.isArray(props.value) ? [...props.value] : props.value === undefined ? [] : [props.value],
);

onMounted(() => emit('comparatorChange', 'eq'));

function onSelectionChange(values: OptionValue | OptionValue[] | null) {
	const picked = Array.isArray(values) ? values : [];
	selectedValues.value = picked;

	if (picked.length === 0) {
		emit('fieldChange', undefined);
		emit('comparatorChange', 'eq');
		return;
	}
	if (picked.length === 1) {
		emit('fieldChange', picked[0]);
		emit('comparatorChange', 'eq');
		return;
	}
	emit('fieldChange', picked);
	emit('comparatorChange', 'in');
}
</script>

<template>
	<UiField floating-label class="select-filter" :label="normalizedLabel" :required="required">
		<UiSelect
			ref="input"
			multiple
			:name="`${label}-${fieldKey}`"
			:model-value="selectedValues"
			:options="options"
			:disabled="disabled"
			:data-testid="`record-${label}-select`"
			@update:model-value="onSelectionChange"
		/>
	</UiField>
</template>
