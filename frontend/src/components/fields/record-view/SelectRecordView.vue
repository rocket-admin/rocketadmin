<script setup lang="ts">
/**
 * Port of record-view-fields/select (`SelectRecordViewComponent`): the label of the matching
 * `widget_params.options` entry (on its `background_color`), else the raw value.
 */
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

interface SelectOption {
	value: unknown;
	label: string;
	background_color?: string;
}

const props = defineProps<RecordViewFieldProps & { value?: string | number | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const option = computed<SelectOption | undefined>(() => {
	const options: SelectOption[] | undefined = widgetParams.value.options;
	return Array.isArray(options) ? options.find((opt) => opt.value === props.value) : undefined;
});

const displayValue = computed(() => {
	if (!props.value) return '—';
	return option.value ? option.value.label : String(props.value);
});

const backgroundColor = computed(() => {
	if (!props.value || !Array.isArray(widgetParams.value.options)) return undefined;
	return option.value?.background_color || 'transparent';
});
</script>

<template>
	<RecordViewValue class="select-record-view" :style="{ backgroundColor }">{{ displayValue }}</RecordViewValue>
</template>

<style scoped>
.select-record-view {
  padding: var(--space-05) var(--space-2);
  border-radius: var(--radius-control);
}
</style>
