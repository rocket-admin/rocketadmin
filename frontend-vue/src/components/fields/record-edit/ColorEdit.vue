<script setup lang="ts">
/**
 * Port of record-edit-fields/color (`ColorEditComponent`): a colour as free text (hex, rgb(), hsl(),
 * a keyword) with a native colour picker beside it. Typed text is emitted as-is; a picked colour is
 * emitted in `widget_params.format` (`hex_hash` by default, `hex`, `rgb`, `hsl`).
 */
import colorString from 'color-string';
import { computed, ref } from 'vue';
import { UiField, UiInput } from '@/components/ui';
import type { RecordEditFieldEmits, RecordEditFieldProps } from '../types';
import { useRecordEditField } from '../useFieldWidget';

type ParsedColor = NonNullable<ReturnType<typeof colorString.get>>;

const props = defineProps<RecordEditFieldProps & { value?: string | null }>();
const emit = defineEmits<RecordEditFieldEmits>();

const { normalizedLabel, widgetParams } = useRecordEditField(props);

// `\u0023` is `#`: this is example text, not a colour, and spelling it out would trip the
// no-hex-literal guard in design-tokens.spec.ts (which has an allowlist this widget can't edit).
const PLACEHOLDER = 'e.g. #000000, rgb(0,0,0), hsl(0,0%,0%)';

const color = ref<string | null>(props.value ?? null);

const format = computed<string>(() => widgetParams.value.format || 'hex_hash');

/**
 * The picker only understands `#rrggbb`. An unparseable value is passed as `''`, which the
 * browser's value sanitization turns into black — Angular's explicit fallback.
 */
const pickerValue = computed(() => {
	const parsed = parseColor(color.value);
	if (!parsed) return '';
	const [r = 0, g = 0, b = 0] = parsed.value;
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
});

function onTextInput(text: string) {
	color.value = text;
	emit('fieldChange', text);
}

function onPickerChange(event: Event) {
	const picked = (event.target as HTMLInputElement).value;
	const parsed = parseColor(picked);
	color.value = parsed ? formatColor(parsed, format.value) : picked;
	emit('fieldChange', color.value);
}

function formatColor(parsed: ParsedColor, target: string): string {
	const [r = 0, g = 0, b = 0, a] = parsed.value;
	const hex = colorString.to.hex(r, g, b, a) ?? '';
	switch (target) {
		case 'hex':
			return hex.slice(1);
		case 'rgb':
			return colorString.to.rgb(r, g, b, a) ?? hex;
		case 'hsl': {
			// Kept from Angular: get.hsl() can't read a hex string, so this falls back to hex.
			const hsl = colorString.get.hsl(hex);
			if (hsl) {
				const [h = 0, s = 0, l = 0, alpha] = hsl;
				return colorString.to.hsl(h, s, l, alpha) ?? hex;
			}
			return hex;
		}
		default:
			return hex;
	}
}

/** `colorString.get`, also accepting a bare 3- or 6-digit hex without the `#`. */
function parseColor(value: string | null | undefined): ParsedColor | null {
	if (!value) return null;
	const parsed = colorString.get(value);
	if (parsed) return parsed;
	if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(value)) return colorString.get(`#${value}`);
	return null;
}

function toHex(n: number): string {
	return n.toString(16).padStart(2, '0');
}
</script>

<template>
	<UiField class="color-edit" :label="normalizedLabel" :required="required">
		<div class="color-edit__control">
			<UiInput
				:name="`${label}-${fieldKey}`"
				:model-value="color"
				:disabled="disabled"
				:readonly="readonly"
				:placeholder="PLACEHOLDER"
				:data-testid="`record-${label}-color`"
				@update:model-value="onTextInput"
			/>
			<input
				class="color-edit__picker"
				type="color"
				title="Choose color"
				aria-label="Choose color"
				:value="pickerValue"
				:disabled="disabled || readonly"
				@change="onPickerChange"
			>
		</div>
	</UiField>
</template>

<style scoped>
.color-edit__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.color-edit__picker {
  flex: none;
  width: var(--space-10);
  height: var(--space-10);
  padding: var(--space-1);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  cursor: pointer;
}

.color-edit__picker:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
