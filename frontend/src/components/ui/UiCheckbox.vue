<script setup lang="ts">
/**
 * Checkbox with its label — the `mat-checkbox` replacement.
 *
 * The label is the default slot and wraps the native `<input>`, so clicking the text toggles the box
 * and the box needs no `id`. A native checkbox rather than a `role="checkbox"` div: the browser
 * already provides the keyboard handling, form participation and the indeterminate state.
 */
import { computed, useAttrs } from 'vue';

const props = withDefaults(
	defineProps<{
		modelValue?: boolean;
		/** The "some but not all" dash. Visual and ARIA only — clicking still emits a boolean. */
		indeterminate?: boolean;
		disabled?: boolean;
	}>(),
	{ modelValue: false, indeterminate: false, disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

// `class` / `style` are layout passthrough and belong on the root <label> (the whole control);
// everything else (`name`, `value`, `aria-*`) belongs on the native <input>.
const attrs = useAttrs();
// Functions, not computeds: `attrs` is not reactive, so a computed would cache a stale copy.
function rootAttrs() {
	return { class: attrs.class, style: attrs.style };
}
function inputAttrs() {
	const { class: _class, style: _style, ...rest } = attrs;
	return rest;
}

const classes = computed(() => ['ui-checkbox', { 'ui-checkbox--disabled': props.disabled }]);

function onChange(event: Event) {
	emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
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
			class="ui-checkbox__input"
			type="checkbox"
			:checked="modelValue"
			:indeterminate="indeterminate"
			:disabled="disabled"
			@change="onChange"
		>
		<span class="ui-checkbox__label"><slot /></span>
	</label>
</template>

<style scoped>
.ui-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-ink);
  cursor: pointer;
}

.ui-checkbox--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ui-checkbox__input {
  width: var(--space-4);
  height: var(--space-4);
  margin: 0;
  accent-color: var(--color-accent);
  cursor: inherit;
}

.ui-checkbox__input:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

.ui-checkbox__label:empty {
  display: none;
}
</style>
