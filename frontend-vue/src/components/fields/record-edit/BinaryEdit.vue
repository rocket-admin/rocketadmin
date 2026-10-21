<script setup lang="ts">
/**
 * Port of record-edit-fields/binary (`BinaryEditComponent`): a binary column edited as hex, base64
 * or ASCII text (`widget_params.encoding`, hex by default). Valid input emits Buffer-JSON
 * (`{ type: 'Buffer', data }`), malformed input emits the raw string, an empty field emits `null`.
 */
import { computed, ref } from 'vue';
import { UiField, UiTextarea } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import {
	type BinaryBufferJson,
	bytesToEncoded,
	encodedToBytes,
	isBinaryEncoding,
	parseBinaryValue,
	toBufferJson,
} from '@/lib/binary';
import { BASE64_ERROR_MESSAGE, base64Errors } from '@/validators/base64.validator';
import { HEX_ERROR_MESSAGE, hexErrors } from '@/validators/hex.validator';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

const props = defineProps<RecordEditFieldProps & { value?: string | BinaryBufferJson | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

const encoding = computed(() => {
	const raw: unknown = widgetParams.value.encoding;
	return isBinaryEncoding(raw) ? raw : 'hex';
});

const rawInput = ref(bytesToEncoded(parseBinaryValue(props.value), encoding.value));
const dirty = ref(false);

/** The hex/base64 validator directives' message; ASCII accepts anything. */
const validationMessage = computed(() => {
	if (encoding.value === 'hex') return hexErrors(rawInput.value) ? HEX_ERROR_MESSAGE : '';
	if (encoding.value === 'base64') return base64Errors(rawInput.value) ? BASE64_ERROR_MESSAGE : '';
	return '';
});

const error = computed(() => (dirty.value && validationMessage.value) || undefined);

function onInput(text: string) {
	rawInput.value = text;
	dirty.value = true;
	if (!text) {
		emit('fieldChange', null);
		return;
	}
	const bytes = encodedToBytes(text, encoding.value);
	emit('fieldChange', bytes === null ? text : toBufferJson(bytes));
}
</script>

<template>
	<UiField class="binary-edit" :label="`${normalizedLabel} (${encoding})`" :required="required" :error="error">
		<UiTextarea
			v-custom-validity="validationMessage"
			:name="`${label}-${fieldKey}-${encoding}-content`"
			:model-value="rawInput"
			:rows="8"
			mono
			:disabled="disabled"
			:readonly="readonly"
			@update:model-value="onInput"
		/>
	</UiField>
</template>
