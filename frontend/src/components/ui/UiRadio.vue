<script setup lang="ts">
/**
 * One option in a `UiRadioGroup` — the `mat-radio-button` replacement. Must sit inside a group,
 * which supplies the shared `name`, the selection and the change handler.
 *
 * The label is the default slot and wraps the native `<input>`, like `UiCheckbox`, so clicking the
 * text chooses the option and the radio needs no `id`.
 */
import { computed, inject, useAttrs } from 'vue';
import { RADIO_CONTEXT } from './radioContext';
import type { SelectValue } from './selectOption';

const props = withDefaults(
	defineProps<{
		/** This option's value. Typed: `true`, `42` and `null` round-trip through the group's `v-model`. */
		value: SelectValue;
		/** Disables this option only. The group's `disabled` disables all of them. */
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const group = inject(RADIO_CONTEXT);
if (!group) throw new Error('[UiRadio] must be used inside a UiRadioGroup.');

// Same split as UiCheckbox: layout attrs on the root <label>, everything else on the <input>.
const attrs = useAttrs();
function rootAttrs() {
	return { class: attrs.class, style: attrs.style };
}
function inputAttrs() {
	const { class: _class, style: _style, ...rest } = attrs;
	return rest;
}

const isChecked = computed(() => group.selected.value === props.value);
const isDisabled = computed(() => props.disabled || group.disabled.value);

const classes = computed(() => [
	'ui-radio',
	{ 'ui-radio--checked': isChecked.value, 'ui-radio--disabled': isDisabled.value },
]);
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
	<label v-bind="rootAttrs()" :class="classes">
		<input
			v-bind="inputAttrs()"
			class="ui-radio__input"
			type="radio"
			:name="group?.name.value"
			:checked="isChecked"
			:disabled="isDisabled"
			@change="group?.select(value)"
		>
		<span class="ui-radio__label"><slot /></span>
	</label>
</template>

<style scoped>
.ui-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-ink);
  cursor: pointer;
}

.ui-radio--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ui-radio__input {
  width: var(--space-4);
  height: var(--space-4);
  margin: 0;
  accent-color: var(--color-accent);
  cursor: inherit;
}

.ui-radio__input:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
  border-radius: var(--radius-pill);
}

.ui-radio__label:empty {
  display: none;
}
</style>
