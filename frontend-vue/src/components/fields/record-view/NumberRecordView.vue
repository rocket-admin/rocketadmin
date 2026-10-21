<script setup lang="ts">
/**
 * Port of record-view-fields/number (`NumberRecordViewComponent`): a number, converted to the best
 * unit when the widget has a `unit` (`convert`), with an arrow when it is outside
 * `threshold_min` / `threshold_max`.
 */
import convert from 'convert';
import { computed } from 'vue';
import { UiIcon } from '@/components/ui';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: number | string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const isEmpty = computed(() => props.value == null || props.value === '');

const displayValue = computed(() => {
	if (props.value == null || props.value === '') return '—';
	const unit = widgetParams.value.unit;
	if (!unit) return props.value.toString();
	try {
		const converted = convert(parseFloat(String(props.value)), unit as Parameters<typeof convert>[1]).to('best');
		// Max 2 decimal places without trailing zeros
		return `${parseFloat(converted.quantity.toFixed(2)).toString()} ${converted.unit}`;
	} catch (error) {
		console.warn('Unit conversion failed:', error);
		return props.value.toString();
	}
});

const isOutOfThreshold = computed<'up' | 'down' | false>(() => {
	if (isEmpty.value) return false;
	const { threshold_min: min, threshold_max: max } = widgetParams.value;
	const numValue = parseFloat(String(props.value));
	if (min !== undefined && numValue < min) return 'down';
	if (max !== undefined && numValue > max) return 'up';
	return false;
});
</script>

<template>
	<RecordViewValue :class="{ 'number-record-view--out-of-threshold': isOutOfThreshold }">
		{{ displayValue }}
		<!-- Arrows as in Angular: `north` below the minimum, `south` above the maximum. -->
		<UiIcon
			v-if="isOutOfThreshold === 'down'"
			class="number-record-view__icon"
			name="north"
			size="sm"
			label="Below minimum threshold"
		/>
		<UiIcon
			v-if="isOutOfThreshold === 'up'"
			class="number-record-view__icon"
			name="south"
			size="sm"
			label="Above maximum threshold"
		/>
	</RecordViewValue>
</template>

<style scoped>
.number-record-view--out-of-threshold {
  display: flex;
  align-items: center;
  gap: var(--space-05);
}
</style>
