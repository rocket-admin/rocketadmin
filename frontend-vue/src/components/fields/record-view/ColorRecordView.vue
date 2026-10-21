<script setup lang="ts">
/**
 * Port of record-view-fields/color (`ColorRecordViewComponent`): a swatch plus the stored value.
 * Anything `color-string` parses (hex, rgb(), hsl(), names) gets a swatch, and so does bare hex
 * without the `#`.
 */
import colorString from 'color-string';
import { computed } from 'vue';
import type { RecordViewFieldProps, ViewFieldEmits } from '../types';
import RecordViewValue from './RecordViewValue.vue';

const props = defineProps<RecordViewFieldProps & { value?: string | null }>();
defineEmits<ViewFieldEmits>();

const parsed = computed(() => parseColor(props.value));

const isValidColor = computed(() => Boolean(props.value) && parsed.value !== null);

/** The swatch colour, normalized to `#rrggbb` (alpha dropped, as in Angular). */
const normalizedColorForDisplay = computed(() => {
	if (!parsed.value) return '';
	return `#${parsed.value.value.slice(0, 3).map(toHex).join('')}`;
});

function parseColor(color: string | null | undefined) {
	if (!color) return null;
	const result = colorString.get(color);
	if (result) return result;
	if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(color)) return colorString.get(`#${color}`);
	return null;
}

function toHex(n: number): string {
	return n.toString(16).padStart(2, '0');
}
</script>

<template>
	<div class="color-record-view">
		<div
			v-if="isValidColor"
			class="color-record-view__swatch"
			:style="{ backgroundColor: normalizedColorForDisplay }"
			:title="value || 'No color'"
		/>
		<RecordViewValue>{{ value || '—' }}</RecordViewValue>
	</div>
</template>

<style scoped>
.color-record-view {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.color-record-view__swatch {
  flex-shrink: 0;
  width: var(--space-5);
  height: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
}
</style>
