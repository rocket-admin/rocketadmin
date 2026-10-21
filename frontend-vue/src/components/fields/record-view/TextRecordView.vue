<script setup lang="ts">
/**
 * Port of record-view-fields/text (`TextRecordViewComponent`): a short text value, flagged with a
 * wavy underline and a `title` when it fails the widget's `validate` (validator.js method or regex).
 */
import { computed } from 'vue';
import { textErrors } from '@/validators/text.validator';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams } = useViewField(props, emit);

/** Messages of the Angular view widget, which differ slightly from the edit widget's. */
const MESSAGES: Record<string, string> = {
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

const validateType = computed<string | null>(() => widgetParams.value.validate || null);

const isInvalid = computed(() => Boolean(textErrors(props.value, validateType.value, widgetParams.value.regex)));

const validationErrorMessage = computed(() => {
	const type = validateType.value;
	if (!type) return '';
	if (type === 'regex') return 'Does not match the required pattern';
	return MESSAGES[type] || `Invalid ${type.replace(/^is/, '').toLowerCase()}`;
});

const invalidClass = computed(() => ({ 'text-record-view--invalid': isInvalid.value }));
const title = computed(() => (isInvalid.value ? validationErrorMessage.value : undefined));
</script>

<template>
	<RecordViewValue :class="invalidClass" :title="title">{{ value || '—' }}</RecordViewValue>
</template>

<style scoped>
.text-record-view--invalid {
  color: var(--color-danger);
  text-decoration: underline wavy;
  text-underline-offset: 2px;
}
</style>
