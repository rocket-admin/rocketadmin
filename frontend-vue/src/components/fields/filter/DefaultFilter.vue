<script setup lang="ts">
/**
 * Port of filter-fields/default-filter (`DefaultFilterComponent`): the comparator select hosts put
 * around a "simple" value widget (comparator family `text`, `number` or `datetime`, see
 * `comparatorType.ts` / `usesDefaultFilter()`), and that widget rendered through `<component :is>`
 * (the Angular `ndc-dynamic`).
 *
 * - `text` widgets get starts with / ends with / equal / contains / not contains / is empty;
 *   everything else equal / gt / lt / gte / lte / in / between.
 * - `in` swaps the widget for a comma-separated text input and emits the trimmed, non-empty parts
 *   (`undefined` when there are none).
 * - `between` renders the widget twice ("(from)" / "(to)") and emits `[lower, upper]`.
 * - `empty` emits `''` and makes the widget readonly.
 * - Switching into `in` / `between` from another comparator clears the value (`undefined`).
 *
 * Emits the initial `comparator` on mount, as `ngAfterViewInit` did.
 */
import { type Component, computed, onMounted, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { getFilterComparatorType, NUMBER_COMPARATORS, TEXT_COMPARATORS } from './comparatorType';
import FilterComparatorRow from './FilterComparatorRow.vue';
import { type FocusTarget, useAutofocus } from './useAutofocus';

const props = withDefaults(
	defineProps<
		FilterFieldProps & {
			/** The wrapped widget's value; an array for `in` / `between`. */
			value?: unknown;
			/** The stored comparator; `eq` for a new filter. */
			comparator?: string;
			/** The value widget, a component from `@/consts/filter-types`. */
			valueComponent?: Component;
		}
	>(),
	{ comparator: 'eq' },
);
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const inInput = ref<FocusTarget>(null);
useAutofocus(props, inInput);

const comparator = ref(props.comparator);
const value = ref<unknown>(props.value);
const inValueText = ref('');
const betweenLower = ref<unknown>();
const betweenUpper = ref<unknown>();

// ngOnInit
if (comparator.value === 'in' && Array.isArray(props.value)) {
	inValueText.value = props.value.join(', ');
} else if (comparator.value === 'between' && Array.isArray(props.value)) {
	betweenLower.value = props.value[0];
	betweenUpper.value = props.value[1];
}

const comparatorOptions = computed(() =>
	getFilterComparatorType(props.valueComponent) === 'text' ? TEXT_COMPARATORS : NUMBER_COMPARATORS,
);

const innerProps = computed(() => ({
	fieldKey: props.fieldKey,
	label: props.label,
	value: value.value,
	readonly: comparator.value === 'empty',
	structure: props.structure,
	relations: props.relations,
	autofocus: props.autofocus,
}));

const lowerProps = computed(() => ({
	fieldKey: `${props.fieldKey}-lower`,
	label: `${props.label} (from)`,
	value: betweenLower.value,
	structure: props.structure,
	relations: props.relations,
	autofocus: props.autofocus,
}));

const upperProps = computed(() => ({
	fieldKey: `${props.fieldKey}-upper`,
	label: `${props.label} (to)`,
	value: betweenUpper.value,
	structure: props.structure,
	relations: props.relations,
}));

onMounted(() => emit('comparatorChange', comparator.value));

function onComparatorSelect(next: string) {
	const previous = comparator.value;
	comparator.value = next;

	if (next === 'empty') {
		value.value = '';
		emit('fieldChange', '');
	} else if ((next === 'in' || next === 'between') && previous !== next) {
		value.value = undefined;
		inValueText.value = '';
		betweenLower.value = undefined;
		betweenUpper.value = undefined;
		emit('fieldChange', undefined);
	}

	emit('comparatorChange', next);
}

function onValueChange(next: unknown) {
	value.value = next;
	emit('fieldChange', next);
}

function onInTextChange(text: string) {
	inValueText.value = text;
	const parts = text
		.split(',')
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
	value.value = parts.length === 0 ? undefined : parts;
	emit('fieldChange', value.value);
}

function onBetweenLowerChange(next: unknown) {
	betweenLower.value = next;
	value.value = [betweenLower.value, betweenUpper.value];
	emit('fieldChange', value.value);
}

function onBetweenUpperChange(next: unknown) {
	betweenUpper.value = next;
	value.value = [betweenLower.value, betweenUpper.value];
	emit('fieldChange', value.value);
}
</script>

<template>
	<FilterComparatorRow
		class="default-filter"
		:model-value="comparator"
		:options="comparatorOptions"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onComparatorSelect"
	>
		<UiField v-if="comparator === 'in'" :label="`${normalizedLabel} (comma-separated)`" :required="required">
			<UiInput
				ref="inInput"
				:name="`${label}-${fieldKey}-in`"
				placeholder="value1, value2, value3"
				:model-value="inValueText"
				:disabled="disabled"
				@update:model-value="onInTextChange"
			/>
		</UiField>
		<div v-else-if="comparator === 'between'" class="default-filter__between">
			<component :is="valueComponent" v-if="valueComponent" v-bind="lowerProps" @field-change="onBetweenLowerChange" />
			<component :is="valueComponent" v-if="valueComponent" v-bind="upperProps" @field-change="onBetweenUpperChange" />
		</div>
		<component :is="valueComponent" v-else-if="valueComponent" v-bind="innerProps" @field-change="onValueChange" />
	</FilterComparatorRow>
</template>

<style scoped>
.default-filter__between {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.default-filter__between > * {
  flex: 1;
  min-width: 0;
}
</style>
