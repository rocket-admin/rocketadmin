<script setup lang="ts">
/**
 * Port of record-view-fields/money (`MoneyRecordViewComponent`): an amount with its currency
 * symbol. The value is a number/string, or `{ amount, currency }` whose currency wins over
 * `default_currency`. With `cents`, the amount is in minor units and divided by the currency's
 * factor; otherwise `decimal_places` (default 2) applies.
 */
import { computed } from 'vue';
import { getCurrencyByCode, getCurrencyDecimalPlaces, getCurrencyMinorUnitFactor } from '@/consts/currencies';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

const defaultCurrency = computed<string>(() => widgetParams.value.default_currency || '');

const formattedValue = computed(() => {
	const raw = props.value;
	if (raw == null || raw === '') return '';

	let amount: unknown = raw;
	let currency = defaultCurrency.value;
	if (typeof raw === 'object' && 'amount' in raw && raw.amount !== undefined) {
		amount = raw.amount;
		if ('currency' in raw && typeof raw.currency === 'string' && raw.currency) currency = raw.currency;
	}

	let numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
	if (Number.isNaN(numeric)) return '';

	let decimalPlaces: number;
	if (widgetParams.value.cents === true) {
		numeric = numeric / getCurrencyMinorUnitFactor(currency);
		decimalPlaces = getCurrencyDecimalPlaces(currency);
	} else {
		decimalPlaces = widgetParams.value.decimal_places ?? 2;
	}

	return `${symbolFor(currency)}${numeric.toFixed(decimalPlaces)}`;
});

/** Angular only looked a symbol up when a currency was named; an unnamed one has no symbol. */
function symbolFor(currency: string): string {
	if (!currency) return '';
	return getCurrencyByCode(currency)?.symbol ?? '';
}
</script>

<template>
	<RecordViewValue>{{ formattedValue || '—' }}</RecordViewValue>
</template>
