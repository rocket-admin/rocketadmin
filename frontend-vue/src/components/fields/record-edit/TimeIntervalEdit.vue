<script setup lang="ts">
/**
 * Port of record-edit-fields/time-interval (`TimeIntervalEditComponent`): a Postgres `interval`
 * as six number inputs, emitted as a Postgres interval string (`1 year 5 days`) built with
 * `postgres-interval`'s `toPostgres`.
 */
import PostgresInterval from 'postgres-interval';
import { ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

type Unit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type Interval = Record<Unit, number | string | null>;

const props = defineProps<RecordEditFieldProps & { value?: Partial<Interval> | string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel } = useRecordEditField(props);

const UNITS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

const interval = ref<Interval>(initialInterval());

function onInput(unit: Unit, value: string) {
	interval.value = { ...interval.value, [unit]: value === '' ? null : parseFloat(value) };
	const toPostgres: (this: Interval) => string = PostgresInterval.prototype.toPostgres;
	emit('fieldChange', toPostgres.call(interval.value));
}

/**
 * The row's interval object as is (Angular used it directly). A raw interval string — which Angular
 * left unparsed, showing empty inputs — is parsed with `postgres-interval`.
 */
function initialInterval(): Interval {
	const empty: Interval = { years: '', months: '', days: '', hours: '', minutes: '', seconds: '', milliseconds: '' };
	const value = props.value;
	if (!value) return empty;
	if (typeof value === 'string') {
		const parsed = PostgresInterval(value);
		return { ...empty, ...Object.fromEntries(Object.entries(parsed).filter(([, amount]) => amount !== 0)) };
	}
	return { ...empty, ...value };
}
</script>

<template>
	<fieldset class="time-interval-edit">
		<legend class="time-interval-edit__label">
			{{ normalizedLabel }}<span v-if="required" class="time-interval-edit__required" aria-hidden="true"> *</span>
		</legend>
		<UiField v-for="unit in UNITS" :key="unit" :label="unit" :required="required">
			<UiInput
				type="number"
				:name="`${label}-${fieldKey}`"
				:model-value="interval[unit]"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onInput(unit, $event)"
			/>
		</UiField>
	</fieldset>
</template>

<style scoped>
.time-interval-edit {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3) var(--space-4);
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.time-interval-edit__label {
  grid-column: 1 / span 3;
  padding: 0;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.time-interval-edit__required {
  color: var(--color-danger-strong);
}
</style>
