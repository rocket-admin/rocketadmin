<script setup lang="ts">
/**
 * Port of filter-fields/timezone (`TimezoneFilterComponent`): a select of every IANA timezone with
 * its current UTC offset, plus an empty (null) option for nullable columns.
 * Comparator family `timezone` (see `comparatorType.ts`), which no host maps to a comparator list.
 */
import { computed, ref } from 'vue';
import { type SelectOption, UiField, UiSelect } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { BASE_TIMEZONES } from './timezones';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const allowNull = computed(() => Boolean(widgetParams.value.allow_null || props.structure?.allow_null));

const timezones = computed<SelectOption<string | null>[]>(() =>
	allowNull.value ? [{ value: null, label: '' }, ...BASE_TIMEZONES] : BASE_TIMEZONES,
);

const selected = ref<string | null | undefined>(props.value);

function onChange(value: string | null | (string | null)[]) {
	if (Array.isArray(value)) return;
	selected.value = value;
	emit('fieldChange', value);
}
</script>

<template>
	<UiField floating-label class="timezone-filter" :label="normalizedLabel" :required="required">
		<!-- An empty placeholder for a non-nullable column, so nothing shows as picked before a choice
		     (mat-select's empty state); nullable columns have the real null option instead. -->
		<UiSelect
			ref="input"
			:name="`${label}-${fieldKey}`"
			:model-value="selected ?? null"
			:options="timezones"
			:placeholder="allowNull ? undefined : ''"
			:disabled="disabled || readonly"
			:data-testid="`filter-${label}-timezone`"
			@update:model-value="onChange"
		/>
	</UiField>
</template>
