<script setup lang="ts">
/**
 * Port of record-edit-fields/select (`SelectEditComponent`): an enum column, or any column with a
 * Select widget. Options come from `widget_params.options`, else from the enum's
 * `data_type_params`; `allow_null` adds an empty option that stores `null`.
 */
import { computed, ref } from 'vue';
import { type SelectOption, UiField, UiSelect } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

type Option = SelectOption<string | null>;

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const selected = ref<string | null>(props.value ?? null);

const options = computed<Option[]>(() => {
	const widgetOptions: unknown = widgetParams.value.options;
	if (props.widgetStructure && Array.isArray(widgetOptions)) {
		const list = widgetOptions as Option[];
		return widgetParams.value.allow_null ? [{ value: null, label: '' }, ...list] : list;
	}
	if (props.structure) {
		const list = (props.structure.data_type_params ?? []).map((option) => ({ value: option, label: option }));
		return props.structure.allow_null ? [{ value: null, label: '' }, ...list] : list;
	}
	return [];
});

function onChange(value: string | null | (string | null)[]) {
	if (Array.isArray(value)) return;
	selected.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField class="select-edit" :label="normalizedLabel" :required="required">
		<UiSelect
			:name="`${label}-${fieldKey}`"
			:model-value="selected"
			:options="options"
			:disabled="disabled || readonly"
			:data-testid="`record-${label}-select`"
			@update:model-value="onChange"
		/>
	</UiField>
</template>
