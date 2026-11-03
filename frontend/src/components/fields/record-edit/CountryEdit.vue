<script setup lang="ts">
/**
 * Port of record-edit-fields/country (`CountryEditComponent`): an ISO 3166-1 alpha-2 code picked
 * from an autocomplete of country names. Picking a country emits its code; typing alone emits
 * nothing. A nullable column (or `widget_params.allow_null`) gets an empty option that emits `null`.
 * `widget_params.show_flag: false` hides the flag emoji.
 */
import { computed, ref } from 'vue';
import { type AutocompleteOption, UiAutocomplete, UiField } from '@/components/ui';
import { COUNTRIES, getCountryFlag } from '@/consts/countries';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

interface CountryOption {
	value: string | null;
	label: string;
	flag: string;
}

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const showFlag = computed<boolean>(() =>
	widgetParams.value.show_flag !== undefined ? Boolean(widgetParams.value.show_flag) : true,
);

const countries = computed<CountryOption[]>(() => {
	const sorted = COUNTRIES.map((country) => ({
		value: country.code,
		label: country.name,
		flag: getCountryFlag(country.code),
	})).sort((a, b) => a.label.localeCompare(b.label));
	const allowNull = widgetParams.value.allow_null || props.structure?.allow_null;
	return allowNull ? [{ value: null, label: '', flag: '' }, ...sorted] : sorted;
});

/** The picked country — Angular's control holding an object rather than typed text. */
const selected = ref<CountryOption | null>(
	(props.value && countries.value.find((country) => country.value === props.value)) || null,
);
const text = ref(selected.value?.label ?? '');

const options = computed<AutocompleteOption<CountryOption>[]>(() => {
	const query = text.value.toLowerCase();
	return countries.value
		.filter((country) => country.label.toLowerCase().includes(query) || country.value?.toLowerCase().includes(query))
		.map((country) => ({ value: country, label: country.label }));
});

function onInput(value: string) {
	text.value = value;
	selected.value = null;
}

function onSelect(option: AutocompleteOption<CountryOption>) {
	selected.value = option.value;
	text.value = option.label;
	emit('fieldChange', option.value.value);
}
</script>

<template>
	<UiField class="country-edit" :label="normalizedLabel" :required="required">
		<UiAutocomplete
			:model-value="text"
			:options="options"
			:disabled="disabled"
			:readonly="readonly"
			:data-testid="`record-${label}-country`"
			@update:model-value="onInput"
			@select="onSelect"
		>
			<template v-if="showFlag && selected?.flag" #leading>
				<span class="country-edit__flag-prefix" aria-hidden="true">{{ selected.flag }}</span>
			</template>
			<template #option="{ option }">
				<span v-if="showFlag && option.value.flag" class="country-edit__flag" aria-hidden="true">{{ option.value.flag }}</span>
				<span class="country-edit__name">{{ option.label || '—' }}</span>
				<span v-if="option.value.value" class="country-edit__code">({{ option.value.value }})</span>
			</template>
		</UiAutocomplete>
	</UiField>
</template>

<style scoped>
.country-edit__flag-prefix {
  font-size: var(--text-md);
  line-height: 1;
}

.country-edit__flag {
  font-size: var(--text-base);
}

.country-edit__name {
  flex: 1;
}

.country-edit__code {
  font-size: var(--text-2xs);
  color: var(--color-muted);
}
</style>
