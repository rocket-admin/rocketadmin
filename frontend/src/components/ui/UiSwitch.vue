<script setup lang="ts">
/**
 * On/off switch with its label — the `mat-slide-toggle` replacement.
 *
 * A native checkbox with `role="switch"`, wrapped by its `<label>` like `UiCheckbox`: the browser
 * keeps the keyboard handling (Space), form participation and the checked state, and AT announces
 * "on/off" instead of "checked/not checked". The track and thumb are decoration drawn beside the
 * visually hidden input.
 *
 * Use a switch for a setting that takes effect immediately; use `UiCheckbox` for a choice that is
 * submitted with a form.
 *
 * Inside a `UiField` the input picks up the field's hint/error through `aria-describedby`, like
 * `UiInput`. Standalone, it is named by `label` or the default slot.
 */
import { computed, inject, useAttrs } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';

const props = withDefaults(
	defineProps<{
		modelValue?: boolean;
		/** Visible label text. The default slot, when given, replaces it. */
		label?: string;
		/** Which side of the label the track sits on, in logical order. */
		labelPosition?: 'before' | 'after';
		/** Geometry only. */
		size?: 'sm' | 'md';
		disabled?: boolean;
	}>(),
	{ modelValue: false, labelPosition: 'after', size: 'md', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const field = inject(FIELD_CONTEXT, undefined);

// Same split as UiCheckbox: layout attrs on the root <label>, everything else on the <input>.
const attrs = useAttrs();
function rootAttrs() {
	return { class: attrs.class, style: attrs.style };
}
function inputAttrs() {
	const { class: _class, style: _style, ...rest } = attrs;
	return rest;
}

const classes = computed(() => [
	'ui-switch',
	`ui-switch--size-${props.size}`,
	`ui-switch--label-${props.labelPosition}`,
	{ 'ui-switch--checked': props.modelValue, 'ui-switch--disabled': props.disabled },
]);

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
			:id="field?.inputId"
			class="ui-switch__input"
			type="checkbox"
			role="switch"
			:checked="modelValue"
			:disabled="disabled"
			:aria-describedby="field?.describedBy.value"
			@change="onChange"
		>
		<span class="ui-switch__track" aria-hidden="true"><span class="ui-switch__thumb" /></span>
		<span class="ui-switch__label"><slot>{{ label }}</slot></span>
	</label>
</template>

<style scoped>
.ui-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-ink);
  cursor: pointer;
}

.ui-switch--label-before {
  flex-direction: row-reverse;
}

.ui-switch--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Visually hidden but focusable: the input is what keyboard and AT interact with. */
.ui-switch__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.ui-switch__track {
  position: relative;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--color-line-strong);
  transition: background var(--motion-fast) var(--ease-out);
}

.ui-switch--size-md .ui-switch__track {
  width: var(--space-8);
  height: var(--space-5);
}

.ui-switch--size-sm .ui-switch__track {
  width: var(--space-6);
  height: var(--space-4);
}

.ui-switch__thumb {
  position: absolute;
  inset-block: var(--space-05);
  inset-inline-start: var(--space-05);
  aspect-ratio: 1;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition: transform var(--motion-fast) var(--ease-out);
}

.ui-switch--checked .ui-switch__track {
  background: var(--color-accent);
}

/* Track width minus thumb width minus both insets: the thumb's height equals its width. */
.ui-switch--checked.ui-switch--size-md .ui-switch__thumb {
  transform: translateX(calc(var(--space-8) - var(--space-5)));
}

.ui-switch--checked.ui-switch--size-sm .ui-switch__thumb {
  transform: translateX(calc(var(--space-6) - var(--space-4)));
}

/* RTL: the thumb travels toward the logical end. */
.ui-switch--checked.ui-switch--size-md .ui-switch__thumb:dir(rtl) {
  transform: translateX(calc(var(--space-5) - var(--space-8)));
}

.ui-switch--checked.ui-switch--size-sm .ui-switch__thumb:dir(rtl) {
  transform: translateX(calc(var(--space-4) - var(--space-6)));
}

.ui-switch__input:focus-visible + .ui-switch__track {
  box-shadow: var(--ring-focus);
}

.ui-switch__label:empty {
  display: none;
}
</style>
