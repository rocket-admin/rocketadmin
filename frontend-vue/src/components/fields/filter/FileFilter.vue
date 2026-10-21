<script setup lang="ts">
/**
 * Port of filter-fields/file (`FileFilterComponent`): file columns can't be filtered, so it only
 * says so. Comparator family `file` (see `comparatorType.ts`), which no host maps to a comparator list.
 */
import type { FilterFieldEmits, FilterFieldProps } from '../types';

defineProps<FilterFieldProps & { value?: unknown }>();
defineEmits<FilterFieldEmits>();
</script>

<template>
	<div class="file-filter">Not available for filtering</div>
</template>

<style scoped>
.file-filter {
  font-size: var(--text-sm);
  color: var(--color-muted);
}
</style>
