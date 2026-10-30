<script setup lang="ts" generic="T extends SelectValue">
/**
 * Single-choice segmented control — the `mat-button-toggle-group` replacement (Yes / No / Null
 * toggles, unit pickers).
 *
 * Built on a `role="radiogroup"` of native radio inputs, so arrow keys move the choice and AT reads
 * "Yes, radio button, 1 of 2". The radios are visually hidden; the label is the visible segment.
 *
 * `label` names the group. Pass it even when a visible caption sits beside the control — the
 * caption is not programmatically linked otherwise.
 */
import { computed, useId } from 'vue';
import type { SelectOption, SelectValue } from './selectOption';

const props = withDefaults(
	defineProps<{
		/** The chosen value. `undefined`/no match means nothing is pressed. */
		modelValue?: T | null;
		options: SelectOption<T>[];
		/** Accessible name for the group. */
		label: string;
		/** Geometry only. */
		size?: 'sm' | 'md';
		disabled?: boolean;
	}>(),
	{ size: 'md', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [T] }>();

const name = `${useId()}-segmented`;

const classes = computed(() => [
	'ui-segmented',
	`ui-segmented--size-${props.size}`,
	{ 'ui-segmented--disabled': props.disabled },
]);

function select(option: SelectOption<T>) {
	emit('update:modelValue', option.value);
}
</script>

<template>
	<div :class="classes" role="radiogroup" :aria-label="label" :aria-disabled="disabled || undefined">
		<label
			v-for="(option, index) in options"
			:key="index"
			class="ui-segmented__option"
			:class="{ 'ui-segmented__option--selected': modelValue === option.value }"
		>
			<input
				class="ui-segmented__input"
				type="radio"
				:name="name"
				:value="index"
				:checked="modelValue === option.value"
				:disabled="disabled || option.disabled"
				@change="select(option)"
			>
			<span class="ui-segmented__label">{{ option.label }}</span>
		</label>
	</div>
</template>

<style scoped>
.ui-segmented {
  display: inline-flex;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  overflow: hidden;
}

.ui-segmented--disabled {
  opacity: 0.65;
}

.ui-segmented__option {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
  cursor: pointer;
  transition:
    background var(--motion-fast),
    color var(--motion-fast);
}

.ui-segmented--disabled .ui-segmented__option {
  cursor: not-allowed;
}

.ui-segmented__option + .ui-segmented__option {
  border-inline-start: 1px solid var(--color-line);
}

.ui-segmented--size-md .ui-segmented__option {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

.ui-segmented--size-sm .ui-segmented__option {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.ui-segmented__option:hover {
  background: var(--color-paper);
}

.ui-segmented__option--selected,
.ui-segmented__option--selected:hover {
  background: var(--color-accent);
  color: var(--color-surface);
}

/* Visually hidden but focusable: the radio is what keyboard and AT interact with. */
.ui-segmented__input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.ui-segmented__option:has(.ui-segmented__input:focus-visible) {
  box-shadow: inset var(--ring-focus);
}
</style>
