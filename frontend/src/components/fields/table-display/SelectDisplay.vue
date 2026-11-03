<script setup lang="ts">
/** Port of table-display-fields/select (`SelectDisplayComponent`): the option's label, on its `background_color`. */
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

interface SelectWidgetOption {
	value: unknown;
	label: string;
	background_color?: string;
}

const props = defineProps<TableDisplayFieldProps & { value?: string | number | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const option = computed(() => {
	const options: SelectWidgetOption[] | undefined = widgetParams.value.options;
	return options?.find((opt) => opt.value === props.value);
});

/** The option label, else the raw value (an empty string stays empty); `—` only for null. */
const displayValue = computed(() => {
	if (props.value == null) return '—';
	return option.value ? option.value.label : String(props.value);
});

const backgroundColor = computed(() => {
	if (props.value == null || !widgetParams.value.options) return undefined;
	return option.value?.background_color || 'transparent';
});
</script>

<template>
	<TableDisplayCell @copy="copy(displayValue)">
		<span class="select-display__value" :style="{ backgroundColor }">{{ displayValue }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.select-display__value {
  display: inline-block;
  max-width: 100%;
  padding: var(--space-05) var(--space-2);
  overflow: hidden;
  border-radius: var(--radius-control);
  text-overflow: ellipsis;
  vertical-align: middle;
}
</style>
