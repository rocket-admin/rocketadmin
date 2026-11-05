<script setup lang="ts">
/** Port of table-display-fields/text (`TextDisplayComponent`): a short-text cell, flagged when invalid. */
import { computed } from 'vue';
import { textErrors } from '@/validators/text.validator';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | number | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const validateType = computed<string | null>(() => widgetParams.value.validate || null);

/** Same check as the record-edit widget: a `validator.js` method by name, or `regex`. */
const isInvalid = computed(() => Boolean(textErrors(props.value, validateType.value, widgetParams.value.regex)));

const validationErrorMessage = computed(() => validationMessage(validateType.value));

function validationMessage(validateType: string | null): string {
	if (!validateType) return '';
	if (validateType === 'regex') return 'Does not match the required pattern';
	return VALIDATION_MESSAGES[validateType] || `Invalid ${validateType.replace(/^is/, '').toLowerCase()}`;
}

// This widget's own message table (it differs slightly from the record-edit one, as in Angular).
const VALIDATION_MESSAGES: Record<string, string> = {
	isEmail: 'Invalid email address',
	isURL: 'Invalid URL',
	isIP: 'Invalid IP address',
	isUUID: 'Invalid UUID',
	isJSON: 'Invalid JSON',
	isCreditCard: 'Invalid credit card number',
	isISBN: 'Invalid ISBN',
	isAlpha: 'Should contain only letters',
	isNumeric: 'Should contain only numbers',
	isAlphanumeric: 'Should contain only letters and numbers',
	isHexColor: 'Invalid hex color',
	isBase64: 'Invalid Base64 string',
	isMobilePhone: 'Invalid mobile phone number',
	isPostalCode: 'Invalid postal code',
};
</script>

<template>
	<TableDisplayCell @copy="copy(value)">
		<span
			class="text-display__value"
			:class="{ 'text-display__value--invalid': isInvalid }"
			:title="isInvalid ? validationErrorMessage : undefined"
		>{{ value || '—' }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.text-display__value--invalid {
  color: var(--color-danger);
  text-decoration: underline wavy;
  text-underline-offset: 2px;
}
</style>
