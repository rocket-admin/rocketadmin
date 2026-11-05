<script setup lang="ts">
/** Port of filter-fields/static-text (`StaticTextFilterComponent`): the label and a read-only value. */
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';

const props = defineProps<FilterFieldProps & { value?: unknown }>();
defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);
</script>

<template>
	<div class="static-text-filter">
		<span>{{ normalizedLabel }}</span>
		<span class="static-text-filter__value">{{ value }}</span>
	</div>
</template>

<style scoped>
.static-text-filter {
  font-size: var(--text-sm);
  color: var(--color-ink);
}

.static-text-filter__value {
  padding-inline-start: var(--space-2);
  font-style: italic;
  color: var(--color-muted);
}
</style>
