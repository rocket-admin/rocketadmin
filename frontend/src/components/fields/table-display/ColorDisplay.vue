<script setup lang="ts">
/** Port of table-display-fields/color (`ColorDisplayComponent`): a swatch next to the colour value. */
import colorString from 'color-string';
import { computed } from 'vue';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = defineProps<TableDisplayFieldProps & { value?: string | null }>();
const emit = defineEmits<ViewFieldEmits>();

const { copy } = useViewField(props, emit);

const parsed = computed(() => parseColor(props.value));
const isValidColor = computed(() => Boolean(props.value) && parsed.value !== null);

/** Any CSS colour (`red`, `rgb(…)`, a hex with or without the hash) normalized to `#rrggbb` for the swatch. */
const normalizedColorForDisplay = computed(() => {
	// Only rendered for a valid colour (Angular fell back to black here).
	if (!parsed.value) return '';
	const [r, g, b] = parsed.value.value;
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
});

function parseColor(color: string | null | undefined) {
	if (!color) return null;
	const result = colorString.get(color);
	if (result) return result;
	// Hex without the hash.
	if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(color)) return colorString.get(`#${color}`);
	return null;
}

function toHex(n: number | undefined): string {
	return (n ?? 0).toString(16).padStart(2, '0');
}
</script>

<template>
	<TableDisplayCell @copy="copy(value, 'Color value was copied to clipboard.')">
		<span class="color-display">
			<span
				v-if="isValidColor"
				class="color-display__swatch"
				:style="{ backgroundColor: normalizedColorForDisplay }"
				:title="value || 'No color'"
			/>
			<span class="color-display__value">{{ value || '—' }}</span>
		</span>
	</TableDisplayCell>
</template>

<style scoped>
.color-display {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
}

.color-display__swatch {
  flex-shrink: 0;
  width: var(--space-5);
  height: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
}

.color-display__value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
}
</style>
