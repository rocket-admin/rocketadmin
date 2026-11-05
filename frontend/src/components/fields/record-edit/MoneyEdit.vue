<script setup lang="ts">
/**
 * Port of record-edit-fields/money (`MoneyEditComponent`): an amount, optionally with a currency.
 *
 * `widget_params`: `default_currency` (USD), `show_currency_selector` (stores `{ amount, currency }`
 * instead of a bare number), `decimal_places` (2, clamped to 0–10), `allow_negative` (true) and
 * `cents` (store integer minor units; decimals then follow the currency, e.g. 0 for JPY).
 * An empty amount is stored as `''`.
 */
import { computed, nextTick, ref } from 'vue';
import { type SelectOption, UiField, UiInput, UiSelect } from '@/components/ui';
import {
	CURRENCIES,
	getCurrencyDecimalPlaces,
	getCurrencyMinorUnitFactor,
	type Money,
	type MoneyValue,
} from '@/consts/currencies';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

type Amount = number | '';

const props = defineProps<RecordEditFieldProps & { value?: string | number | MoneyValue | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const defaultCurrency = computed<string>(() =>
	typeof widgetParams.value.default_currency === 'string' ? widgetParams.value.default_currency : 'USD',
);
const showCurrencySelector = computed(() => widgetParams.value.show_currency_selector === true);
const allowNegative = computed(() => widgetParams.value.allow_negative !== false);
const cents = computed(() => widgetParams.value.cents === true);

const selectedCurrency = ref(defaultCurrency.value);
const amount = ref<Amount>('');
const displayAmount = ref('');
const control = ref<HTMLElement | null>(null);

/** With `cents` the currency decides (0 for zero-decimal currencies), otherwise `decimal_places`. */
const decimalPlaces = computed(() => {
	if (cents.value) return getCurrencyDecimalPlaces(selectedCurrency.value);
	const configured: unknown = widgetParams.value.decimal_places;
	return typeof configured === 'number' ? Math.max(0, Math.min(10, configured)) : 2;
});

const currencyOptions: SelectOption<string>[] = CURRENCIES.map((currency) => ({
	value: currency.code,
	label: `${currency.flag || ''} ${currency.code} - ${currency.name}`,
}));

const selectedCurrencyData = computed<Money>(
	() => CURRENCIES.find((c) => c.code === selectedCurrency.value) || (CURRENCIES[0] as Money),
);
const placeholder = computed(() => `Enter amount in ${selectedCurrencyData.value.name}`);

initializeMoneyValue();

function onCurrencyChange(code: string | null | (string | null)[]) {
	if (typeof code !== 'string') return;
	selectedCurrency.value = code;
	if (cents.value && amount.value !== '') {
		const rounded = parseFloat(amount.value.toFixed(decimalPlaces.value));
		amount.value = rounded;
		displayAmount.value = formatAmount(rounded);
	}
	updateValue();
}

function onAmountChange(typed: string) {
	let cleanValue = typed.replace(/[^\d.-]/g, '');
	if (!allowNegative.value) cleanValue = cleanValue.replace(/-/g, '');

	const numericValue = parseFloat(cleanValue);
	if (!Number.isNaN(numericValue)) {
		amount.value = numericValue;
		// Not reformatted while typing, so the caret stays put; `onAmountBlur` formats.
		displayAmount.value = cleanValue;
	} else if (cleanValue === '' || cleanValue === '-') {
		amount.value = '';
		displayAmount.value = cleanValue;
	} else {
		// Unparseable: revert to the previous amount.
		displayAmount.value = formatAmount(amount.value);
	}
	syncInput();
	updateValue();
}

function onAmountBlur() {
	if (amount.value !== '') displayAmount.value = formatAmount(amount.value);
}

function formatAmount(value: Amount | string): string {
	if (value === '') return '';
	const numeric = typeof value === 'string' ? parseFloat(value) : value;
	return Number.isNaN(numeric) ? '' : numeric.toFixed(decimalPlaces.value);
}

function updateValue() {
	if (amount.value === '') {
		emit('fieldChange', '');
		return;
	}
	const stored = toMinorUnits();
	emit('fieldChange', showCurrencySelector.value ? { amount: stored, currency: selectedCurrency.value } : stored);
}

function initializeMoneyValue() {
	const value = props.value;
	if (value === '' || value === null || value === undefined) return;
	if (typeof value === 'string') {
		parseStringValue(value);
	} else if (typeof value === 'object') {
		if (value.amount !== undefined && value.currency) {
			selectedCurrency.value = value.currency;
			amount.value = fromMinorUnits(value.amount);
			displayAmount.value = formatAmount(amount.value);
		}
	} else {
		amount.value = fromMinorUnits(value);
		displayAmount.value = formatAmount(amount.value);
	}
}

/** "100.50 USD", "USD 100.50", "$100.50": a 3-letter code, else a known symbol, else the default. */
function parseStringValue(value: string) {
	const currencyMatch = value.match(/([A-Z]{3})/);
	const numberMatch = value.match(/([\d,.-]+)/);

	selectedCurrency.value =
		currencyMatch?.[1] ?? CURRENCIES.find((c) => value.includes(c.symbol))?.code ?? defaultCurrency.value;

	if (numberMatch?.[1]) {
		const parsed = parseFloat(numberMatch[1].replace(/,/g, ''));
		amount.value = Number.isNaN(parsed) ? '' : fromMinorUnits(parsed);
		displayAmount.value = formatAmount(amount.value);
	}
}

function fromMinorUnits(stored: number | string): Amount {
	const numeric = typeof stored === 'string' ? parseFloat(stored) : stored;
	if (Number.isNaN(numeric)) return '';
	return cents.value ? numeric / getCurrencyMinorUnitFactor(selectedCurrency.value) : numeric;
}

/** The amount to store, read from the typed text so float drift (20.99 * 100) is rounded away. */
function toMinorUnits(): number {
	const source = displayAmount.value !== '' ? displayAmount.value.replace(/[^\d.-]/g, '') : String(amount.value);
	const numeric = parseFloat(source);
	if (Number.isNaN(numeric)) return 0;
	return cents.value ? Math.round(numeric * getCurrencyMinorUnitFactor(selectedCurrency.value)) : numeric;
}

/**
 * Write the cleaned text back to the `<input>`. When it equals the previous `displayAmount` (the
 * user typed only rejected characters), the model doesn't change, so Vue won't patch the DOM.
 */
function syncInput() {
	nextTick(() => {
		const input = control.value?.querySelector('input');
		if (input && input.value !== displayAmount.value) input.value = displayAmount.value;
	});
}
</script>

<template>
	<div class="money-edit">
		<UiField v-if="showCurrencySelector" class="money-edit__currency" label="Currency">
			<UiSelect
				:model-value="selectedCurrency"
				:options="currencyOptions"
				:disabled="disabled"
				:data-testid="`record-${label}-money-selector`"
				@update:model-value="onCurrencyChange"
			/>
		</UiField>

		<UiField class="money-edit__amount" :label="normalizedLabel" :required="required">
			<div ref="control" class="money-edit__control">
				<span v-if="displayAmount" class="money-edit__symbol">{{ selectedCurrencyData.symbol }}</span>
				<UiInput
					:model-value="displayAmount"
					:placeholder="placeholder"
					:disabled="disabled"
					:readonly="readonly"
					step="0.01"
					:data-testid="`record-${label}-money-amount`"
					@update:model-value="onAmountChange"
					@blur="onAmountBlur"
				/>
			</div>
		</UiField>
	</div>
</template>

<style scoped>
.money-edit {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
}

.money-edit__currency {
  flex-shrink: 0;
  min-width: 180px;
}

.money-edit__amount {
  flex: 1;
  min-width: 120px;
}

.money-edit__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.money-edit__symbol {
  font-weight: var(--weight-medium);
  color: var(--color-ink);
}

@media (max-width: 768px) {
  .money-edit {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .money-edit__currency {
    min-width: 0;
  }
}
</style>
