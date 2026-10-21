<script setup lang="ts">
/**
 * Port of record-view-fields/range (`RangeRecordViewComponent`): `value / max` above a meter of
 * where the value sits between `widget_params.min` (0) and `max` (100), clamped to the bar.
 */
import { computed } from 'vue';
import { UiProgressBar } from '@/components/ui';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';

const props = defineProps<RecordViewFieldProps & { value?: number | string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const min = computed(() => (widgetParams.value.min !== undefined ? Number(widgetParams.value.min) || 0 : 0));
const max = computed(() => (widgetParams.value.max !== undefined ? Number(widgetParams.value.max) || 100 : 100));
const numValue = computed(() => Number(props.value) || 0);

const displayValue = computed(() => `${numValue.value} / ${max.value}`);

/** Position between min and max as a percentage, clamped to [0, 100]. */
const progress = computed(() => {
	const range = max.value - min.value;
	if (range === 0) return 0;
	return Math.max(0, Math.min(100, ((numValue.value - min.value) / range) * 100));
});
</script>

<template>
	<div class="range-record-view">
		<div class="range-record-view__label">{{ displayValue }}</div>
		<UiProgressBar class="range-record-view__bar" :value="progress" :max="100" :label="fieldKey || 'Range'" />
	</div>
</template>

<style scoped>
.range-record-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-1) 0;
}

.range-record-view__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.range-record-view__bar {
  min-width: 160px;
}
</style>
