<script setup lang="ts">
/**
 * Port of filter-fields/phone (`PhoneFilterComponent`), a "smart" filter with its own comparator:
 * equal, country code, starts with, contains, is empty. "Country code" picks a country and filters
 * `startswith` on its dial code; an incoming value equal to a dial code restores that mode and
 * emits `startswith` on mount. In the default `eq` mode nothing is emitted on mount.
 */
import { computed, onMounted, ref } from 'vue';
import { type AutocompleteOption, type SelectOption, UiAutocomplete, UiField, UiInput } from '@/components/ui';
import { COUNTRIES, type Country, getCountryFlag } from '@/consts/countries';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import FilterComparatorRow from './FilterComparatorRow.vue';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type PhoneFilterMode = 'eq' | 'country' | 'startswith' | 'contains' | 'empty';

interface CountryWithFlag extends Country {
	flag: string;
}

const COUNTRIES_WITH_FLAGS: CountryWithFlag[] = COUNTRIES.filter((country) => country.dialCode).map((country) => ({
	...country,
	flag: getCountryFlag(country.code),
}));

const MODES: SelectOption<PhoneFilterMode>[] = [
	{ value: 'eq', label: 'equal' },
	{ value: 'country', label: 'country code' },
	{ value: 'startswith', label: 'starts with' },
	{ value: 'contains', label: 'contains' },
	{ value: 'empty', label: 'is empty' },
];

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const initialCountry = props.value ? COUNTRIES_WITH_FLAGS.find((c) => c.dialCode === props.value) : undefined;
const filterMode = ref<PhoneFilterMode>(initialCountry ? 'country' : 'eq');
const text = ref<string | null | undefined>(props.value);
/** The picked country — the Angular `countryControl` holding an object rather than typed text. */
const selectedCountry = ref<CountryWithFlag | null>(initialCountry ?? null);
const countryText = ref(initialCountry ? displayFn(initialCountry) : '');

const countryOptions = computed<AutocompleteOption<CountryWithFlag>[]>(() => {
	const selected = selectedCountry.value;
	const query = (
		selected && countryText.value === displayFn(selected) ? selected.name : countryText.value
	).toLowerCase();
	return COUNTRIES_WITH_FLAGS.filter(
		(country) =>
			country.name.toLowerCase().includes(query) ||
			country.code.toLowerCase().includes(query) ||
			country.dialCode?.includes(query),
	).map((country) => ({ value: country, label: displayFn(country) }));
});

onMounted(() => {
	if (filterMode.value !== 'eq')
		emit('comparatorChange', filterMode.value === 'country' ? 'startswith' : filterMode.value);
});

function onFilterModeChange(mode: string) {
	filterMode.value = mode as PhoneFilterMode;
	if (mode === 'country') {
		text.value = selectedCountry.value?.dialCode ?? '';
		emit('comparatorChange', 'startswith');
	} else if (mode === 'empty') {
		text.value = '';
		emit('comparatorChange', 'empty');
	} else {
		emit('comparatorChange', mode);
	}
	emit('fieldChange', text.value);
}

function onCountryInput(value: string) {
	countryText.value = value;
	selectedCountry.value = null;
}

function onCountrySelected(option: AutocompleteOption<CountryWithFlag>) {
	selectedCountry.value = option.value;
	text.value = option.value.dialCode;
	emit('fieldChange', text.value);
	emit('comparatorChange', 'startswith');
}

function onValueChange(value: string) {
	text.value = value;
	emit('fieldChange', value);
	emit('comparatorChange', filterMode.value);
}

function displayFn(country: CountryWithFlag): string {
	return `${country.flag} ${country.name} (${country.dialCode})`;
}
</script>

<template>
	<FilterComparatorRow
		class="phone-filter"
		:model-value="filterMode"
		:options="MODES"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onFilterModeChange"
	>
		<UiField v-if="filterMode === 'country'" :label="`${normalizedLabel} (country)`" :required="required">
			<UiAutocomplete
				ref="input"
				:model-value="countryText"
				:options="countryOptions"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onCountryInput"
				@select="onCountrySelected"
			>
				<template #option="{ option }">
					<span class="phone-filter__flag" aria-hidden="true">{{ option.value.flag }}</span>
					<span class="phone-filter__name">{{ option.value.name }}</span>
					<span class="phone-filter__dial-code">({{ option.value.dialCode }})</span>
				</template>
			</UiAutocomplete>
		</UiField>
		<UiField v-else-if="filterMode !== 'empty'" :label="normalizedLabel" :required="required">
			<UiInput
				ref="input"
				type="text"
				:name="`${label}-${fieldKey}`"
				:model-value="text ?? null"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onValueChange"
			/>
		</UiField>
	</FilterComparatorRow>
</template>

<style scoped>
.phone-filter__flag {
  font-size: var(--text-base);
}

.phone-filter__name {
  flex: 1;
}

.phone-filter__dial-code {
  font-size: var(--text-xs);
  color: var(--color-muted);
}
</style>
