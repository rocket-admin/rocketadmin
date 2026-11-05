<script setup lang="ts">
/**
 * Port of record-view-fields/binary (`BinaryRecordViewComponent`): binary data (a server string
 * of char-code bytes, or Buffer JSON) encoded as `widget_params.encoding` — hex (default),
 * base64 or ascii — truncated to 80 characters (full text in the `title`), with a copy button.
 */
import { computed } from 'vue';
import { UiIconButton } from '@/components/ui';
import { bytesToEncoded, isBinaryEncoding, parseBinaryValue } from '@/lib/binary';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import RecordViewValue from './RecordViewValue.vue';

const MAX_DISPLAY_LENGTH = 80;

const props = defineProps<RecordViewFieldProps & { value?: unknown }>();
const emit = defineEmits<ViewFieldEmits>();

const { widgetParams, copy } = useViewField(props, emit);

const bytes = computed(() => parseBinaryValue(props.value));
const encoding = computed(() => {
	const raw: unknown = widgetParams.value.encoding;
	return isBinaryEncoding(raw) ? raw : 'hex';
});
const encodedValue = computed(() => bytesToEncoded(bytes.value, encoding.value));
const isTruncated = computed(() => encodedValue.value.length > MAX_DISPLAY_LENGTH);
const displayText = computed(() => {
	const encoded = encodedValue.value;
	if (!encoded) return '—';
	return isTruncated.value ? `${encoded.substring(0, MAX_DISPLAY_LENGTH)}…` : encoded;
});

const fullTitle = computed(() => (isTruncated.value ? encodedValue.value : undefined));

function onCopy() {
	copy(encodedValue, 'Binary data was copied to clipboard.');
}
</script>

<template>
	<div class="binary-record-view">
		<RecordViewValue class="binary-record-view__value" :title="fullTitle">{{ displayText }}</RecordViewValue>
		<UiIconButton v-if="encodedValue" icon="content_copy" :label="`Copy ${encoding}`" size="sm" @click="onCopy" />
	</div>
</template>

<style scoped>
.binary-record-view {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.binary-record-view__value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  word-break: break-all;
}
</style>
