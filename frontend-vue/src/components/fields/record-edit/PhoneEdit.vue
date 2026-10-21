<script setup lang="ts">
/**
 * Port of record-edit-fields/phone (`PhoneEditComponent`): a country picker plus a number input
 * formatted as you type (`libphonenumber-js`). A valid number is stored in E.164 (`+12024561111`);
 * anything else is stored as typed, minus whitespace. Typing `+…` detects the country.
 *
 * `widget_params`: `preferred_countries` (listed first; the first is the default, `['US', 'GB']`),
 * `enable_placeholder` (true), `phone_validation` (true).
 */
import { AsYouType, type CountryCode, type PhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { computed, nextTick, ref } from 'vue';
import { type AutocompleteOption, UiAutocomplete, UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';
import { PHONE_COUNTRIES, type PhoneCountry } from './PhoneEdit.countries';

const EXAMPLE_NUMBERS: Record<string, string> = {
	US: '(202) 456-1111',
	GB: '020 7946 0958',
	CA: '(416) 555-1234',
	AU: '(02) 1234 5678',
	DE: '030 12345678',
	FR: '01 23 45 67 89',
};

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const preferredCountries = computed<string[]>(() =>
	Array.isArray(widgetParams.value.preferred_countries) ? widgetParams.value.preferred_countries : ['US', 'GB'],
);
const enablePlaceholder = computed(() => widgetParams.value.enable_placeholder !== false);
const phoneValidation = computed(() => widgetParams.value.phone_validation !== false);

const selectedCountry = ref<PhoneCountry | null>(null);
const displayPhoneNumber = ref('');
/** The country input's text. */
const countryText = ref('');
/** What the user typed to search countries; `null` once a country is picked (shows the full list). */
const countryQuery = ref<string | null>(null);
const phoneControl = ref<HTMLElement | null>(null);

const sortedCountries = computed(() => {
	const preferred = PHONE_COUNTRIES.filter((c) => preferredCountries.value.includes(c.code));
	const others = PHONE_COUNTRIES.filter((c) => !preferredCountries.value.includes(c.code));
	return [...preferred, ...others];
});

const countryOptions = computed<AutocompleteOption<PhoneCountry>[]>(() => {
	const query = countryQuery.value?.toLowerCase();
	const countries = query
		? sortedCountries.value.filter(
				(c) =>
					c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query) || c.dialCode.includes(query),
			)
		: sortedCountries.value;
	return countries.map((country) => ({ value: country, label: displayCountry(country) }));
});

const phonePlaceholder = computed(() => {
	if (!enablePlaceholder.value) return '';
	if (selectedCountry.value) return `Local number or ${selectedCountry.value.dialCode}1234567890`;
	return 'Enter +1234567890 or select country';
});

const hint = computed(() => {
	if (selectedCountry.value && !displayPhoneNumber.value.startsWith('+')) {
		const code = selectedCountry.value.code;
		return `Example: ${EXAMPLE_NUMBERS[code] || `${selectedCountry.value.dialCode} 123 4567`}`;
	}
	return 'Enter international number (e.g., +1234567890) or select country first';
});

const isValidPhoneNumber = computed(() => {
	if (!phoneValidation.value || !displayPhoneNumber.value) return true;
	const parsed = parse(displayPhoneNumber.value);
	return parsed ? parsed.isValid() : false;
});

/** Angular rendered this `mat-error` but no validator ever put the control in an error state. */
const error = computed(() =>
	phoneValidation.value && !isValidPhoneNumber.value && displayPhoneNumber.value
		? 'Invalid phone number format'
		: undefined,
);

initializePhoneNumber();

function onCountryInput(text: string) {
	countryText.value = text;
	countryQuery.value = text;
}

function onCountrySelected(option: AutocompleteOption<PhoneCountry>) {
	selectCountry(option.value);
	formatAndUpdatePhoneNumber();
}

function onPhoneNumberChange(typed: string) {
	displayPhoneNumber.value = typed;
	if (typed.startsWith('+')) detectCountryFromInput();
	else formatAndUpdatePhoneNumber();
	syncPhoneInput();
}

function displayCountry(country: PhoneCountry): string {
	return `${country.flag} ${country.name} ${country.dialCode}`;
}

function initializePhoneNumber() {
	const value = props.value;
	if (value) parseExistingPhoneNumber(value);
	else setDefaultCountry();
}

function parseExistingPhoneNumber(fullNumber: string) {
	let phoneNumber = tryParse(fullNumber);
	if (!phoneNumber?.country) phoneNumber = tryParse(fullNumber, (preferredCountries.value[0] || 'US') as CountryCode);

	const country = phoneNumber?.country && PHONE_COUNTRIES.find((c) => c.code === phoneNumber?.country);
	if (phoneNumber && country) {
		selectCountry(country);
		displayPhoneNumber.value = phoneNumber.formatNational();
		return;
	}

	setDefaultCountry();
	const digits = fullNumber.replace(/\D/g, '');
	displayPhoneNumber.value = digits ? formatAsYouType(digits) : fullNumber;
}

function setDefaultCountry() {
	selectCountry(
		PHONE_COUNTRIES.find((c) => c.code === preferredCountries.value[0]) || (PHONE_COUNTRIES[0] as PhoneCountry),
	);
}

function selectCountry(country: PhoneCountry) {
	selectedCountry.value = country;
	countryText.value = displayCountry(country);
	countryQuery.value = null;
}

function formatAndUpdatePhoneNumber() {
	if (!displayPhoneNumber.value) {
		emit('fieldChange', '');
		return;
	}
	if (!displayPhoneNumber.value.startsWith('+')) displayPhoneNumber.value = formatAsYouType(displayPhoneNumber.value);
	updateFullPhoneNumber();
}

function detectCountryFromInput() {
	const phoneNumber = tryParse(displayPhoneNumber.value);
	const country = phoneNumber?.country && PHONE_COUNTRIES.find((c) => c.code === phoneNumber?.country);
	if (phoneNumber && country) {
		selectCountry(country);
		displayPhoneNumber.value = phoneNumber.formatNational();
	}
	updateFullPhoneNumber();
}

function updateFullPhoneNumber() {
	const phoneNumber = parse(displayPhoneNumber.value);
	emit('fieldChange', phoneNumber?.isValid() ? phoneNumber.number : displayPhoneNumber.value.replace(/\s/g, ''));
}

/** The number in international form, or national for the selected country; `null` when unparseable. */
function parse(text: string): PhoneNumber | null {
	if (text.startsWith('+')) return tryParse(text);
	if (selectedCountry.value && text) return tryParse(text, selectedCountry.value.code as CountryCode);
	return null;
}

function tryParse(text: string, country?: CountryCode): PhoneNumber | null {
	try {
		return parsePhoneNumber(text, country);
	} catch {
		return null;
	}
}

function formatAsYouType(text: string): string {
	return selectedCountry.value ? new AsYouType(selectedCountry.value.code as CountryCode).input(text) : text;
}

/** The formatter may hand back the previous text (a rejected keystroke); Vue won't patch that. */
function syncPhoneInput() {
	nextTick(() => {
		const input = phoneControl.value?.querySelector('input');
		if (input && input.value !== displayPhoneNumber.value) input.value = displayPhoneNumber.value;
	});
}
</script>

<template>
	<div class="phone-edit">
		<UiField class="phone-edit__country" label="Country">
			<UiAutocomplete
				:model-value="countryText"
				:options="countryOptions"
				:readonly="readonly"
				:disabled="disabled"
				placeholder="Search country..."
				@update:model-value="onCountryInput"
				@select="onCountrySelected"
			>
				<template #option="{ option }">
					<span class="phone-edit__flag">{{ option.value.flag }}</span>
					<span class="phone-edit__dial-code">{{ option.value.dialCode }}</span>
					<span class="phone-edit__country-name">{{ option.value.name }}</span>
				</template>
			</UiAutocomplete>
		</UiField>

		<UiField class="phone-edit__number" :label="normalizedLabel" :required="required" :hint="hint" :error="error">
			<div ref="phoneControl">
				<UiInput
					type="tel"
					:name="`${label}-${fieldKey}`"
					:model-value="displayPhoneNumber"
					:placeholder="phonePlaceholder"
					:readonly="readonly"
					:disabled="disabled"
					:data-testid="`record-${label}-phone`"
					@update:model-value="onPhoneNumberChange"
				/>
			</div>
		</UiField>
	</div>
</template>

<style scoped>
.phone-edit {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
}

.phone-edit__country {
  flex: 0 0 200px;
  min-width: 200px;
}

.phone-edit__number {
  flex: 1;
  min-width: 0;
}

.phone-edit__flag {
  width: 20px;
  font-size: var(--text-md);
  text-align: center;
}

.phone-edit__dial-code {
  min-width: 40px;
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

.phone-edit__country-name {
  color: var(--color-muted);
}

@media (max-width: 768px) {
  .phone-edit {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .phone-edit__country {
    flex: none;
    width: 100%;
  }
}
</style>
