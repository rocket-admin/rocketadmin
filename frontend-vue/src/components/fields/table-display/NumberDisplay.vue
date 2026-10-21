<script setup lang="ts">
/**
 * Port of table-display-fields/number (`NumberDisplayComponent`): a right-aligned number, converted
 * to the best `unit` (via `convert`), with an arrow when outside `threshold_min` / `threshold_max`.
 */
import convert from 'convert';
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: number | string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const isEmpty = computed(() => props.value == null || props.value === '');

const displayValue = computed(() => {
	if (props.value == null || props.value === '') return '—';
	const unit = widgetParams.value.unit;
	if (!unit) return props.value.toString();
	try {
		const converted = convert(parseFloat(String(props.value)), unit as Parameters<typeof convert>[1]).to('best');
		// At most 2 decimals, no trailing zeros.
		return `${parseFloat(converted.quantity.toFixed(2))} ${converted.unit}`;
	} catch (error) {
		console.warn('Unit conversion failed:', error);
		return props.value.toString();
	}
});

/**
 * Ported condition-for-condition from Angular, including its `!== null` checks: an absent
 * (`undefined`) bound counts as set, so `{ threshold_min: 0 }` alone never flags.
 */
const isOutOfThreshold = computed<'up' | 'down' | false>(() => {
	if (isEmpty.value) return false;
	const min = widgetParams.value.threshold_min;
	const max = widgetParams.value.threshold_max;
	const num = parseFloat(String(props.value));
	if (min !== null && max !== null && num < min) return 'down';
	if (min && max === null && num < min) return 'down';
	if (max !== null && min !== null && num > max) return 'up';
	if (max && min === null && num > max) return 'up';
	return false;
});
</script>

<template>
	<TableDisplayCell align="end" @copy="copy(value)">
		<span class="number-display__value" :class="{ 'number-display__value--out-of-threshold': isOutOfThreshold }">
			{{ displayValue }}
			<UiIcon v-if="isOutOfThreshold === 'down'" name="south" size="sm" label="Below threshold" />
			<UiIcon v-if="isOutOfThreshold === 'up'" name="north" size="sm" label="Above threshold" />
		</span>
	</TableDisplayCell>
</template>

<style scoped>
.number-display__value--out-of-threshold {
  display: inline-flex;
  align-items: center;
  gap: var(--space-05);
}
</style>
