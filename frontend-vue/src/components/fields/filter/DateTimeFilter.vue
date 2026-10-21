<script setup lang="ts">
/**
 * Port of filter-fields/date-time (`DateTimeFilterComponent`), a "smart" filter with its own
 * comparator: the presets last hour / day / week / month / year (emitted as `gte` <now minus the
 * period>, UTC ISO without milliseconds), on / after / before / on or after / on or before
 * (`eq`/`gt`/`lt`/`gte`/`lte` on `<date>T<time>Z`), between (`[lower, upper]`, a missing bound is
 * `null`) and in (comma-separated ISO datetimes).
 *
 * On mount, like `ngAfterViewInit`: with no value it emits the default `last_day` preset and `gte`;
 * a string value restores `gte` with its local date and time and re-emits `gte`.
 *
 * `comparator` is an addition: Angular kept the between / in restore paths but its mode always
 * started at `last_day`, so they could never run. Passing the stored comparator (`between` or `in`)
 * with an array value restores them. Without it the Angular behaviour is unchanged.
 */
import { format, subDays, subHours, subMonths, subYears } from 'date-fns';
import { onMounted, ref } from 'vue';
import { type SelectOption, UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import FilterComparatorRow from './FilterComparatorRow.vue';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const MODES: SelectOption<string>[] = [
	{ value: 'last_hour', label: 'last hour' },
	{ value: 'last_day', label: 'last day' },
	{ value: 'last_week', label: 'last week' },
	{ value: 'last_month', label: 'last month' },
	{ value: 'last_year', label: 'last year' },
	{ value: 'eq', label: 'on' },
	{ value: 'gt', label: 'after' },
	{ value: 'lt', label: 'before' },
	{ value: 'gte', label: 'on or after' },
	{ value: 'lte', label: 'on or before' },
	{ value: 'between', label: 'between' },
	{ value: 'in', label: 'in' },
];

const PRESET_MODES = ['last_hour', 'last_day', 'last_week', 'last_month', 'last_year'];

const props = defineProps<
	FilterFieldProps & {
		value?: string | (string | null)[] | null;
		/** The stored comparator, to restore a `between` / `in` filter from its array value. */
		comparator?: string;
	}
>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const filterMode = ref('last_day');
const date = ref<string | undefined>();
const time = ref<string | undefined>();
const lowerDate = ref<string | undefined>();
const lowerTime = ref<string | undefined>();
const upperDate = ref<string | undefined>();
const upperTime = ref<string | undefined>();
const inValueText = ref('');
const BOUNDS = { lowerDate, lowerTime, upperDate, upperTime };

// ngOnInit
if ((props.comparator === 'between' || props.comparator === 'in') && Array.isArray(props.value)) {
	filterMode.value = props.comparator;
	if (props.comparator === 'between') restoreBetween(props.value);
	else inValueText.value = props.value.join(', ');
} else if (typeof props.value === 'string' && props.value) {
	const datetime = new Date(props.value);
	date.value = format(datetime, 'yyyy-MM-dd');
	time.value = format(datetime, 'HH:mm:ss');
	filterMode.value = 'gte';
}

onMounted(() => {
	if (filterMode.value === 'between' || filterMode.value === 'in') {
		emit('comparatorChange', filterMode.value);
	} else if (props.value) {
		// Angular emitted the mode as is here: `gte` for a restored string. (An array value without
		// `comparator` emits `last_day`, as it did in Angular.)
		emit('comparatorChange', filterMode.value);
	} else {
		emit('fieldChange', computePresetValue(filterMode.value));
		emit('comparatorChange', 'gte');
	}
});

function isPresetMode(): boolean {
	return PRESET_MODES.includes(filterMode.value);
}

function onFilterModeChange(mode: string) {
	const previous = filterMode.value;
	filterMode.value = mode;

	if (PRESET_MODES.includes(mode)) {
		emit('fieldChange', computePresetValue(mode));
		emit('comparatorChange', 'gte');
		return;
	}

	if (mode === 'in' || mode === 'between') {
		if (previous !== mode) {
			inValueText.value = '';
			lowerDate.value = undefined;
			lowerTime.value = undefined;
			upperDate.value = undefined;
			upperTime.value = undefined;
			emit('fieldChange', undefined);
		}
		emit('comparatorChange', mode);
		return;
	}

	emit('comparatorChange', mode);
	if (date.value) emit('fieldChange', `${date.value}T${time.value || '00:00'}Z`);
}

function onDateChange(value: string) {
	date.value = value;
	if (!time.value) time.value = '00:00:00';
	emit('fieldChange', `${date.value}T${time.value}Z`);
	emit('comparatorChange', filterMode.value);
}

function onTimeChange(value: string) {
	time.value = value;
	emit('fieldChange', `${date.value}T${time.value}Z`);
	emit('comparatorChange', filterMode.value);
}

function onBetweenChange(bound: 'lowerDate' | 'lowerTime' | 'upperDate' | 'upperTime', value: string) {
	BOUNDS[bound].value = value;
	emit('fieldChange', [
		composeDateTime(lowerDate.value, lowerTime.value),
		composeDateTime(upperDate.value, upperTime.value),
	]);
	emit('comparatorChange', 'between');
}

function onInTextChange(text: string) {
	inValueText.value = text;
	const parts = text
		.split(',')
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
	if (parts.length === 0) {
		emit('fieldChange', undefined);
		return;
	}
	emit('fieldChange', parts);
	emit('comparatorChange', 'in');
}

function restoreBetween(value: (string | null)[]) {
	if (value[0]) {
		const iso = new Date(value[0]).toISOString();
		lowerDate.value = iso.slice(0, 10);
		lowerTime.value = iso.slice(11, 19);
	}
	if (value[1]) {
		const iso = new Date(value[1]).toISOString();
		upperDate.value = iso.slice(0, 10);
		upperTime.value = iso.slice(11, 19);
	}
}

function composeDateTime(dateValue: string | undefined, timeValue: string | undefined): string | null {
	if (!dateValue) return null;
	return `${dateValue}T${timeValue || '00:00:00'}Z`;
}

/** Now minus the preset's period, as a genuine UTC ISO string without milliseconds. */
function computePresetValue(mode: string): string {
	const now = new Date();
	let target: Date;
	switch (mode) {
		case 'last_hour':
			target = subHours(now, 1);
			break;
		case 'last_day':
			target = subDays(now, 1);
			break;
		case 'last_week':
			target = subDays(now, 7);
			break;
		case 'last_month':
			target = subMonths(now, 1);
			break;
		case 'last_year':
			target = subYears(now, 1);
			break;
		default:
			target = now;
	}
	return target.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
</script>

<template>
	<FilterComparatorRow
		class="date-time-filter"
		:model-value="filterMode"
		:options="MODES"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onFilterModeChange"
	>
		<div v-if="filterMode === 'between'" class="date-time-filter__between">
			<div class="date-time-filter__couple">
				<UiField :label="`${normalizedLabel} (from date)`" :required="required">
					<UiInput
						ref="input"
						type="date"
						:name="`${label}-${fieldKey}-lower-date`"
						:model-value="lowerDate ?? null"
						:disabled="disabled"
						@update:model-value="onBetweenChange('lowerDate', $event)"
					/>
				</UiField>
				<UiField label="(from time)" :required="required">
					<UiInput
						type="time"
						:name="`${label}-${fieldKey}-lower-time`"
						:model-value="lowerTime ?? null"
						:disabled="disabled"
						@update:model-value="onBetweenChange('lowerTime', $event)"
					/>
				</UiField>
			</div>
			<div class="date-time-filter__couple">
				<UiField :label="`${normalizedLabel} (to date)`" :required="required">
					<UiInput
						type="date"
						:name="`${label}-${fieldKey}-upper-date`"
						:model-value="upperDate ?? null"
						:disabled="disabled"
						@update:model-value="onBetweenChange('upperDate', $event)"
					/>
				</UiField>
				<UiField label="(to time)" :required="required">
					<UiInput
						type="time"
						:name="`${label}-${fieldKey}-upper-time`"
						:model-value="upperTime ?? null"
						:disabled="disabled"
						@update:model-value="onBetweenChange('upperTime', $event)"
					/>
				</UiField>
			</div>
		</div>
		<UiField
			v-else-if="filterMode === 'in'"
			:label="`${normalizedLabel} (comma-separated ISO datetimes)`"
			:required="required"
		>
			<UiInput
				ref="input"
				:name="`${label}-${fieldKey}-in`"
				placeholder="2024-01-01T00:00:00Z, 2024-02-01T00:00:00Z"
				:model-value="inValueText"
				:disabled="disabled"
				@update:model-value="onInTextChange"
			/>
		</UiField>
		<div v-else-if="!isPresetMode()" class="date-time-filter__couple">
			<UiField :label="`${normalizedLabel} (date)`" :required="required">
				<UiInput
					ref="input"
					type="date"
					:name="`${label}-${fieldKey}-date`"
					:model-value="date ?? null"
					:disabled="disabled"
					:readonly="readonly"
					:data-testid="`record-${label}-date`"
					@update:model-value="onDateChange"
				/>
			</UiField>
			<UiField :label="`${normalizedLabel} (time)`" :required="required">
				<UiInput
					type="time"
					:name="`${label}-${fieldKey}-time`"
					:model-value="time ?? null"
					:disabled="disabled"
					:readonly="readonly"
					:data-testid="`record-${label}-time`"
					@update:model-value="onTimeChange"
				/>
			</UiField>
		</div>
	</FilterComparatorRow>
</template>

<style scoped>
.date-time-filter__between {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.date-time-filter__couple {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
</style>
