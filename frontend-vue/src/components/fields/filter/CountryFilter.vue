<script setup lang="ts">
/**
 * Port of filter-fields/country (`CountryFilterComponent`): a country autocomplete, filtered by name
 * or ISO code as you type; picking one emits its code (`null` for the empty option nullable
 * columns get).
 */
import { computed, ref } from 'vue';
import { type AutocompleteOption, UiAutocomplete, UiField } from '@/components/ui';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import { type FocusTarget, useAutofocus } from './useAutofocus';

interface CountryOption {
	value: string | null;
	label: string;
	flag: string;
}

const BASE_COUNTRIES: CountryOption[] = COUNTRIES.map((country) => ({
	value: country.code,
	label: country.name,
	flag: getCountryFlag(country.code),
}));

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const countries = computed<CountryOption[]>(() =>
	widgetParams.value.allow_null || props.structure?.allow_null
		? [{ value: null, label: '', flag: '' }, ...BASE_COUNTRIES]
		: BASE_COUNTRIES,
);

const initial = props.value ? countries.value.find((country) => country.value === props.value) : undefined;
/** The picked country; while the text still shows it, the list filters by its name (mat-autocomplete's object value). */
const selected = ref<CountryOption | null>(initial ?? null);
const text = ref(initial?.label ?? '');

const options = computed<AutocompleteOption<CountryOption>[]>(() => {
	const query = (
		selected.value && text.value === selected.value.label ? selected.value.label : text.value
	).toLowerCase();
	return countries.value
		.filter((country) => country.label.toLowerCase().includes(query) || country.value?.toLowerCase().includes(query))
		.map((country) => ({ value: country, label: country.label }));
});

function onInput(value: string) {
	text.value = value;
	selected.value = null;
}

function onCountrySelected(option: AutocompleteOption<CountryOption>) {
	selected.value = option.value;
	emit('fieldChange', option.value.value);
}
</script>

<template>
	<UiField class="country-filter" :label="normalizedLabel" :required="required">
		<UiAutocomplete
			ref="input"
			:model-value="text"
			:options="options"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-country`"
			@update:model-value="onInput"
			@select="onCountrySelected"
		>
			<template #option="{ option }">
				<span v-if="option.value.flag" class="country-filter__flag" aria-hidden="true">{{ option.value.flag }}</span>
				<span class="country-filter__name">{{ option.value.label }}</span>
				<span v-if="option.value.value" class="country-filter__code">({{ option.value.value }})</span>
			</template>
		</UiAutocomplete>
	</UiField>
</template>

<style scoped>
.country-filter__flag {
  font-size: var(--text-base);
}

.country-filter__name {
  flex: 1;
}

.country-filter__code {
  font-size: var(--text-xs);
  color: var(--color-muted);
}
</style>
