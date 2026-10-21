<script setup lang="ts">
/**
 * Port of filter-fields/long-text (`LongTextFilterComponent`): a textarea filter value, `rows`
 * from widget params. Comparator family `text`, so hosts wrap it in `DefaultFilter`.
 */
import { computed, ref, watch } from 'vue';
import { UiField, UiTextarea } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

/** `widget_params.rows`, 4 without one. */
const rowsCount = computed(() => Number(widgetParams.value.rows) || 4);

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
	<UiField class="long-text-filter" :label="normalizedLabel" :required="required">
		<UiTextarea
			ref="input"
			class="long-text-filter__textarea"
			:name="`${label}-${fieldKey}`"
			:rows="rowsCount"
			:model-value="text"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-long-text`"
			@update:model-value="onInput"
		/>
	</UiField>
</template>

<style scoped>
.long-text-filter .long-text-filter__textarea {
  resize: none;
}
</style>
