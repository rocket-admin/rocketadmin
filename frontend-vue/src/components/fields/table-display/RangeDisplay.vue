<script setup lang="ts">
/** Port of table-display-fields/range (`RangeDisplayComponent`): `value / max` over a progress bar between `min` and `max`. */
import { computed } from 'vue';
import { UiProgressBar } from '@/components/ui';
import type { TableDisplayFieldProps } from '../types';
import { parseWidgetParams } from '../useFieldWidget';

const props = defineProps<TableDisplayFieldProps & { value?: number | string | null }>();

const params = computed(() => parseWidgetParams(props.widgetStructure));
const min = computed(() => (params.value.min !== undefined ? Number(params.value.min) || 0 : 0));
const max = computed(() => (params.value.max !== undefined ? Number(params.value.max) || 100 : 100));

const numValue = computed(() => Number(props.value) || 0);
const displayValue = computed(() => `${numValue.value} / ${max.value}`);

/** Percent of the way from `min` to `max`, clamped to 0–100. */
const progress = computed(() => {
	const range = max.value - min.value;
	if (range === 0) return 0;
	return Math.max(0, Math.min(100, ((numValue.value - min.value) / range) * 100));
});
</script>

<template>
	<div class="range-display">
		<div class="range-display__label">{{ displayValue }}</div>
		<UiProgressBar :value="progress" :max="100" :label="displayValue" />
	</div>
</template>

<style scoped>
.range-display {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-1) 0;
}

.range-display__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}
</style>
