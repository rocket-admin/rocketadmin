<script setup lang="ts">
/**
 * Port of table-display-fields/money (`MoneyDisplayComponent`): an amount with its currency symbol.
 * The value is a number/string, or `{ amount, currency }` whose currency overrides `default_currency`;
 * with `cents` the amount is in minor units.
 */
import { computed } from 'vue';
import { getCurrencyByCode, getCurrencyDecimalPlaces, getCurrencyMinorUnitFactor } from '@/consts/currencies';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<
	TableDisplayFieldProps & { value?: number | string | { amount?: number | string; currency?: string } | null }
>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const formattedValue = computed(() => {
	const raw = props.value;
	if (raw == null || raw === '') return '';

	const defaultCurrency: string = widgetParams.value.default_currency || '';
	let currency = defaultCurrency;
	let amount: number | string | undefined;

	if (typeof raw === 'object' && raw.amount !== undefined) {
		amount = raw.amount;
		if (raw.currency) currency = raw.currency;
	} else {
		amount = typeof raw === 'object' ? undefined : raw;
	}

	const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
	if (Number.isNaN(numeric)) return '';

	const symbol = currency ? (getCurrencyByCode(currency)?.symbol ?? '') : '';

	if (widgetParams.value.cents === true) {
		return `${symbol}${(numeric / getCurrencyMinorUnitFactor(currency)).toFixed(getCurrencyDecimalPlaces(currency))}`;
	}
	return `${symbol}${numeric.toFixed(widgetParams.value.decimal_places ?? 2)}`;
});
</script>

<template>
	<TableDisplayCell align="end" @copy="copy(formattedValue)">{{ formattedValue || '—' }}</TableDisplayCell>
</template>
