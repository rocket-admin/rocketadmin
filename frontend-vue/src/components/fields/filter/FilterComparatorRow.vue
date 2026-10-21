<script setup lang="ts">
/**
 * The layout every "smart" Angular filter repeated (`.filter-row` / `.comparator-field` /
 * `.value-field`): its own comparator `mat-select`, then the value control(s) in the default slot.
 * Used by DefaultFilter, DateTimeFilter, EmailFilter, PhoneFilter and BinaryFilter.
 *
 * The comparator select has no visible label (it had none in Angular either); `label` becomes its
 * accessible name. The row aligns to the end, so the select lines up with the value control
 * under its UiField label.
 */

import type { SelectOption } from '@/components/ui';
import { UiSelect } from '@/components/ui';

defineProps<{
	/** The selected comparator / filter mode. */
	modelValue: string;
	options: SelectOption<string>[];
	/** Accessible name of the comparator select, e.g. "Email comparator". */
	label: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [string] }>();

function onSelect(value: string | string[] | null) {
	if (typeof value === 'string') emit('update:modelValue', value);
}
</script>

<template>
	<div class="filter-comparator-row">
		<UiSelect
			class="filter-comparator-row__comparator"
			:model-value="modelValue"
			:options="options"
			:aria-label="label"
			:disabled="disabled"
			data-testid="filter-comparator"
			@update:model-value="onSelect"
		/>
		<div v-if="$slots.default" class="filter-comparator-row__value">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.filter-comparator-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  width: 100%;
}

.filter-comparator-row .filter-comparator-row__comparator {
  flex: 0 0 auto;
  width: auto;
  min-width: 9.5rem;
}

.filter-comparator-row__value {
  flex: 1;
  min-width: 0;
}
</style>
