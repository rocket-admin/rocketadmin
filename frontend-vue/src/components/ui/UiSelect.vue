<script setup lang="ts" generic="T extends SelectValue">
/**
 * Dropdown control on a native `<select>` — the `mat-select` replacement.
 *
 * Native on purpose: the platform picker is keyboard- and screenreader-complete on every device,
 * and none of the Angular `mat-select`s needed anything a native one can't show (no icons or rich
 * rows in options). Searchable lists use `UiAutocomplete` instead.
 *
 * Option values are typed, not strings: the `<option>`s carry their index, and the change handler
 * maps it back, so `true`, `42` and `null` round-trip through `v-model` unchanged.
 *
 * `multiple` renders a native list box and makes the model an array.
 */
import { computed, inject } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';
import type { SelectOption, SelectValue } from './selectOption';

const props = withDefaults(
	defineProps<{
		/** The selected value, or an array of them with `multiple`. */
		modelValue?: T | T[] | null;
		options: SelectOption<T>[];
		/** Text for an empty first option. Choosing it sets the model to `null`. Ignored with `multiple`. */
		placeholder?: string;
		/** Native multi-select list box; the model becomes an array. */
		multiple?: boolean;
		/** Geometry only. `sm` for dense rows such as a filter comparator. */
		size?: 'sm' | 'md';
		disabled?: boolean;
		/** Set explicitly only when used outside a `UiField`, which otherwise supplies it. */
		invalid?: boolean;
	}>(),
	{ multiple: false, size: 'md', disabled: false, invalid: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [T | T[] | null] }>();

const field = inject(FIELD_CONTEXT, undefined);

const isInvalid = computed(() => props.invalid ?? field?.invalid.value ?? false);

const classes = computed(() => [
	'ui-select',
	`ui-select--size-${props.size}`,
	{ 'ui-select--multiple': props.multiple, 'ui-select--invalid': isInvalid.value },
]);

function isSelected(value: T): boolean {
	if (props.multiple) return Array.isArray(props.modelValue) && props.modelValue.includes(value);
	return props.modelValue === value;
}

/** True when nothing matches, so the placeholder option shows as selected. */
const noneSelected = computed(() => !props.options.some((option) => isSelected(option.value)));

function onChange(event: Event) {
	const select = event.target as HTMLSelectElement;
	if (props.multiple) {
		const values = Array.from(select.selectedOptions)
			.map((option) => props.options[Number(option.value)])
			.filter((option): option is SelectOption<T> => option !== undefined)
			.map((option) => option.value);
		emit('update:modelValue', values);
		return;
	}
	// The placeholder's value is "", and `Number('')` is 0 — without this guard choosing the
	// placeholder would emit the first option instead of null.
	const option = select.value === '' ? undefined : props.options[Number(select.value)];
	emit('update:modelValue', option === undefined ? null : option.value);
}
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
	<select
		v-bind="$attrs"
		:id="field?.inputId"
		:class="classes"
		:multiple="multiple"
		:disabled="disabled"
		:required="field?.required.value || undefined"
		:aria-describedby="field?.describedBy.value"
		:aria-invalid="isInvalid ? 'true' : undefined"
		@change="onChange"
	>
		<option v-if="placeholder !== undefined && !multiple" value="" :selected="noneSelected">{{ placeholder }}</option>
		<option
			v-for="(option, index) in options"
			:key="index"
			:value="index"
			:selected="isSelected(option.value)"
			:disabled="option.disabled"
		>
			{{ option.label }}
		</option>
	</select>
</template>

<style scoped>
.ui-select {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-family: inherit;
  color: var(--color-ink);
  background-color: var(--color-surface);
  transition:
    border-color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.ui-select--size-md {
  padding: 0.625rem var(--space-3);
  font-size: var(--text-base);
}

.ui-select--size-sm {
  padding: var(--space-2) var(--space-2);
  font-size: var(--text-sm);
}

.ui-select--multiple {
  padding: var(--space-1);
}

.ui-select:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--ring-focus);
}

.ui-select--invalid {
  border-color: var(--color-danger-strong);
}

.ui-select--invalid:focus-visible {
  box-shadow: var(--ring-danger);
}

.ui-select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background-color: var(--color-paper);
}
</style>
