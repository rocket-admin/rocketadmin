<script setup lang="ts">
/**
 * Port of filter-fields/binary-data-caption (`BinaryDataCaptionFilterComponent`): the label and a
 * "binary data" caption, for binary columns that cannot be filtered. Not referenced by the maps.
 */
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';

const props = defineProps<FilterFieldProps>();
defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);
</script>

<template>
	<div class="binary-data-caption-filter">
		<span>{{ normalizedLabel }}</span>
		<span class="binary-data-caption-filter__value" :data-testid="`record-${label}-binary-data-caption`">
			binary data
		</span>
	</div>
</template>

<style scoped>
.binary-data-caption-filter {
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.binary-data-caption-filter__value {
  padding-inline-start: var(--space-2);
  font-style: italic;
  color: var(--color-muted);
}
</style>
