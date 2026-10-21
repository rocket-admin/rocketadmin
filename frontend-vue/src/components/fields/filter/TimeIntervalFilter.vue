<script setup lang="ts">
/**
 * Port of filter-fields/time-interval (`TimeIntervalFilterComponent`): years … seconds number
 * inputs; emits the Postgres interval string (`postgres-interval`'s `toPostgres`).
 * Comparator family `number`, so hosts wrap it in `DefaultFilter`.
 */
import PostgresInterval from 'postgres-interval';
import { type ComponentPublicInstance, reactive, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type IntervalUnit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type Interval = Record<IntervalUnit, number | null>;

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

/** The visible inputs, in order; milliseconds are kept from the value but have no input. */
const UNITS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

const interval = reactive<Interval>(
	props.value
		? parseIntervalString(props.value)
		: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 },
);

function onInputChange(unit: IntervalUnit, raw: string) {
	interval[unit] = raw === '' ? null : Number.parseFloat(raw);
	const toPostgres = (PostgresInterval as unknown as { prototype: PostgresInterval.IPostgresInterval }).prototype
		.toPostgres;
	emit('fieldChange', toPostgres.call({ ...interval }));
}

/** The first input is the autofocus target. */
function setUnitRef(el: Element | ComponentPublicInstance | null, index: number) {
	if (index === 0) input.value = el instanceof Element ? (el as HTMLElement) : el;
}

/** The Angular `parseIntervalString`: sums every `<number> <unit>` pair, units singular or plural. */
function parseIntervalString(text: string): Interval {
	const units: Record<string, IntervalUnit> = {
		year: 'years',
		years: 'years',
		month: 'months',
		months: 'months',
		day: 'days',
		days: 'days',
		hour: 'hours',
		hours: 'hours',
		minute: 'minutes',
		minutes: 'minutes',
		second: 'seconds',
		seconds: 'seconds',
		millisecond: 'milliseconds',
		milliseconds: 'milliseconds',
	};
	const result: Record<IntervalUnit, number> = {
		years: 0,
		months: 0,
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		milliseconds: 0,
	};
	const regex = /(\d+(?:\.\d+)?)\s*(years?|months?|days?|hours?|minutes?|seconds?|milliseconds?)/gi;
	for (const match of text.matchAll(regex)) {
		const key = units[(match[2] ?? '').toLowerCase()];
		if (key) result[key] += Number.parseFloat(match[1] ?? '0');
	}
	return result;
}
</script>

<template>
	<div class="time-interval-filter">
		<span class="time-interval-filter__label">
			{{ normalizedLabel }} <span v-if="required" aria-hidden="true">*</span>
		</span>
		<UiField v-for="(unit, index) in UNITS" :key="unit" :label="unit" :required="required">
			<UiInput
				:ref="(el) => setUnitRef(el, index)"
				type="number"
				:name="`${label}-${fieldKey}`"
				:model-value="interval[unit]"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onInputChange(unit, $event)"
			/>
		</UiField>
	</div>
</template>

<style scoped>
.time-interval-filter {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2) var(--space-4);
}

.time-interval-filter__label {
  grid-column: 1 / span 3;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}
</style>
