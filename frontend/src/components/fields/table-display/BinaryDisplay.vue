<script setup lang="ts">
/** Port of table-display-fields/binary (`BinaryDisplayComponent`): bytes shown (and copied) as hex, base64 or ascii. */
import { computed } from 'vue';
import { bytesToEncoded, isBinaryEncoding, parseBinaryValue } from '@/lib/binary';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const MAX_DISPLAY_LENGTH = 20;

const props = defineProps<
	TableDisplayFieldProps & {
		/** A server string (one char per byte), a Buffer JSON `{ type, data }` or a Uint8Array. */
		value?: string | { type: string; data: number[] } | Uint8Array | null;
	}
>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const bytes = computed(() => parseBinaryValue(props.value));
const encoding = computed(() => (isBinaryEncoding(widgetParams.value.encoding) ? widgetParams.value.encoding : 'hex'));
const encodedValue = computed(() => bytesToEncoded(bytes.value, encoding.value));
const copyLabel = computed(() => `Copy ${encoding.value}`);

const displayText = computed(() => {
	const encoded = encodedValue.value;
	if (!encoded) return '—';
	return encoded.length > MAX_DISPLAY_LENGTH ? `${encoded.substring(0, MAX_DISPLAY_LENGTH)}…` : encoded;
});
</script>

<template>
	<TableDisplayCell
		:copyable="Boolean(encodedValue)"
		:copy-label="copyLabel"
		@copy="copy(encodedValue, 'Binary data was copied to clipboard.')"
	>
		<span class="binary-display__value">{{ displayText }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.binary-display__value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
</style>
