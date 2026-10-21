<script setup lang="ts">
/**
 * The text control. Owns geometry only — label, hint, error and the ARIA wiring belong to
 * `UiField`, which this picks up through `inject` when nested inside one.
 *
 * Geometry needed no arbitration: all four hand-rolled copies already agreed on
 * `0.625rem 0.75rem`; only the off-brand pair's `8px` radius and cyan focus ring differed.
 *
 * Standalone use is supported — without a `UiField` ancestor the injected context is absent and the
 * caller supplies `id`/`aria-describedby`/`invalid` itself.
 */
import { computed, inject } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';

const props = withDefaults(
	defineProps<{
		modelValue?: string;
		type?: 'text' | 'email' | 'password' | 'url' | 'search';
		/** Geometry only. `sm` for dense rows such as an inline rename. */
		size?: 'sm' | 'md';
		placeholder?: string;
		disabled?: boolean;
		autocomplete?: string;
		/** Set explicitly only when used outside a `UiField`, which otherwise supplies it. */
		invalid?: boolean;
	}>(),
	// `invalid: undefined` disables Vue's boolean-prop casting for it. Without this an unpassed
	// `invalid` arrives as `false` rather than `undefined`, and the `??` below would short-circuit —
	// meaning a UiField's error state could never reach the control.
	{ type: 'text', size: 'md', invalid: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [string] }>();

// `false` for the injected default rather than `undefined`, so a standalone input has a context
// shape to fall back on without every read needing an optional chain.
const field = inject(FIELD_CONTEXT, undefined);

/** An explicit `invalid` prop wins, so a standalone input can be marked invalid with no field. */
const isInvalid = computed(() => props.invalid ?? field?.invalid.value ?? false);

const classes = computed(() => ['ui-input', `ui-input--size-${props.size}`, { 'ui-input--invalid': isInvalid.value }]);

function onInput(event: Event) {
	emit('update:modelValue', (event.target as HTMLInputElement).value);
}
</script>

<script lang="ts">
export default {
  /* The root *is* the control, so a caller's `class`/`name`/`maxlength` must land on the <input>
     itself rather than being merged twice by the automatic fallthrough. */
  inheritAttrs: false,
}
</script>

<template>
	<input
		v-bind="$attrs"
		:id="field?.inputId"
		:class="classes"
		:type="type"
		:value="modelValue"
		:placeholder="placeholder"
		:disabled="disabled"
		:autocomplete="autocomplete"
		:required="field?.required.value || undefined"
		:aria-describedby="field?.describedBy.value"
		:aria-invalid="isInvalid ? 'true' : undefined"
		@input="onInput"
	>
</template>

<style scoped>
.ui-input {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-family: inherit;
  color: var(--color-ink);
  background: var(--color-surface);
  transition:
    border-color var(--motion-fast),
    box-shadow var(--motion-fast);
}

/* 0.625rem is off the 4px scale, but it's the vertical padding all four hand-rolled copies already
   used, and snapping to --space-3 would grow every input in the app by 4px. Not --space-25, which
   is reserved for brand lockup gaps. */
.ui-input--size-md {
  padding: 0.625rem var(--space-3);
  font-size: var(--text-base);
}

.ui-input--size-sm {
  padding: var(--space-2) var(--space-2);
  font-size: var(--text-sm);
}

.ui-input::placeholder {
  color: var(--color-muted-soft);
}

/* :focus-visible, not :focus — a text input still matches :focus-visible on click, so this only
   drops the ring for programmatic focus, which is the intent. */
.ui-input:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--ring-focus);
}

.ui-input--invalid {
  border-color: var(--color-danger-strong);
}

.ui-input--invalid:focus-visible {
  border-color: var(--color-danger-strong);
  box-shadow: var(--ring-danger);
}

.ui-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: var(--color-paper);
}
</style>
