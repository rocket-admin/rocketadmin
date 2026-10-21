<script setup lang="ts">
/**
 * Port of filter-fields/binary (`BinaryFilterComponent`), a "smart" filter with its own comparator
 * (equal, contains, starts with, is empty). The value is typed in the widget's `encoding` (hex by
 * default, base64 or ascii) and always emitted as hex — `''` while the input doesn't decode.
 */
import { computed, ref } from 'vue';
import { type SelectOption, UiField, UiInput } from '@/components/ui';
import { vCustomValidity } from '@/directives/customValidity';
import { bytesToEncoded, bytesToHex, encodedToBytes, hexStringToBytes, isBinaryEncoding } from '@/lib/binary';
import { BASE64_ERROR_MESSAGE, base64Errors } from '@/validators/base64.validator';
import { HEX_ERROR_MESSAGE, hexErrors } from '@/validators/hex.validator';
import type { FilterFieldEmits, FilterFieldProps } from '../types';
import { useFilterField } from '../useFieldWidget';
import FilterComparatorRow from './FilterComparatorRow.vue';
import { type FocusTarget, useAutofocus } from './useAutofocus';

type BinaryFilterMode = 'eq' | 'contains' | 'startswith' | 'empty';

const MODES: SelectOption<BinaryFilterMode>[] = [
	{ value: 'eq', label: 'equal' },
	{ value: 'contains', label: 'contains' },
	{ value: 'startswith', label: 'starts with' },
	{ value: 'empty', label: 'is empty' },
];

const PLACEHOLDERS = { hex: '48656c6c6f', base64: 'SGVsbG8=', ascii: 'Hello' } as const;

const props = defineProps<FilterFieldProps & { value?: string | null }>();
const emit = defineEmits<FilterFieldEmits>();

const { normalizedLabel, widgetParams } = useFilterField(props);

const input = ref<FocusTarget>(null);
useAutofocus(props, input);

const encoding = computed(() => {
	const raw: unknown = widgetParams.value.encoding;
	return isBinaryEncoding(raw) ? raw : 'hex';
});

const filterMode = ref<BinaryFilterMode>('eq');
/** The incoming hex, normalised through bytes (a malformed value becomes empty) and shown in the encoding. */
const rawInput = ref(bytesToEncoded(hexStringToBytes(props.value ?? ''), encoding.value));
const dirty = ref(false);

/** The hexValidator / base64Validator directive messages; ascii has no rule. */
const validationMessage = computed(() => {
	if (encoding.value === 'hex') return hexErrors(rawInput.value) ? HEX_ERROR_MESSAGE : '';
	if (encoding.value === 'base64') return base64Errors(rawInput.value) ? BASE64_ERROR_MESSAGE : '';
	return '';
});

const error = computed(() => (dirty.value && validationMessage.value) || undefined);

function onFilterModeChange(mode: string) {
	filterMode.value = mode as BinaryFilterMode;
	if (mode === 'empty') {
		rawInput.value = '';
		dirty.value = false;
		emit('comparatorChange', 'empty');
		emit('fieldChange', '');
		return;
	}
	emit('comparatorChange', mode);
	emit('fieldChange', currentHex());
}

function onInputChange(value: string) {
	rawInput.value = value;
	dirty.value = true;
	emit('fieldChange', currentHex());
	emit('comparatorChange', filterMode.value);
}

function currentHex(): string {
	if (!rawInput.value) return '';
	const bytes = encodedToBytes(rawInput.value, encoding.value);
	return bytes === null ? '' : bytesToHex(bytes);
}
</script>

<template>
	<FilterComparatorRow
		class="binary-filter"
		:model-value="filterMode"
		:options="MODES"
		:label="`${normalizedLabel} comparator`"
		@update:model-value="onFilterModeChange"
	>
		<UiField v-if="filterMode !== 'empty'" :label="`${normalizedLabel} (${encoding})`" :required="required" :error="error">
			<UiInput
				ref="input"
				v-custom-validity="validationMessage"
				type="text"
				:name="`${label}-${fieldKey}`"
				:placeholder="PLACEHOLDERS[encoding]"
				:model-value="rawInput"
				:disabled="disabled"
				:readonly="readonly"
				@update:model-value="onInputChange"
			/>
		</UiField>
	</FilterComparatorRow>
</template>
