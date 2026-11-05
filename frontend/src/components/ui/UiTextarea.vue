<script setup lang="ts">
/**
 * Multi-line text control — the `matInput` on a `<textarea>` replacement (long text, JSON, XML).
 *
 * Same contract as `UiInput`: geometry only, and the label/hint/error wiring comes from a `UiField`
 * ancestor through `inject`. Standalone use passes `invalid` itself.
 */
import { computed, inject } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';

const props = withDefaults(
	defineProps<{
		/** `null` renders as empty, so a nullable DB column can be bound directly. */
		modelValue?: string | null;
		/** Visible rows before the control scrolls. */
		rows?: number;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		/** Monospace text, for code-like content (JSON, XML, hex dumps). */
		mono?: boolean;
		/** Set explicitly only when used outside a `UiField`, which otherwise supplies it. */
		invalid?: boolean;
	}>(),
	{ rows: 4, disabled: false, readonly: false, mono: false, invalid: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [string] }>();

const field = inject(FIELD_CONTEXT, undefined);

const isInvalid = computed(() => props.invalid ?? field?.invalid.value ?? false);

const classes = computed(() => [
	'ui-textarea',
	{ 'ui-textarea--mono': props.mono, 'ui-textarea--invalid': isInvalid.value },
]);

function onInput(event: Event) {
	emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
	<textarea
		v-bind="$attrs"
		:id="field?.inputId"
		:class="classes"
		:value="modelValue ?? ''"
		:rows="rows"
		:placeholder="placeholder"
		:disabled="disabled"
		:readonly="readonly"
		:required="field?.required.value || undefined"
		:aria-describedby="field?.describedBy.value"
		:aria-invalid="isInvalid ? 'true' : undefined"
		@input="onInput"
	/>
</template>

<style scoped>
.ui-textarea {
  width: 100%;
  min-height: var(--space-12);
  padding: 0.625rem var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  font-family: inherit;
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-ink);
  background: var(--color-surface);
  resize: vertical;
  transition:
    border-color var(--motion-fast),
    box-shadow var(--motion-fast);
}

.ui-textarea--mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.ui-textarea::placeholder {
  color: var(--color-muted-soft);
}

.ui-textarea:focus-visible {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: var(--ring-focus);
}

.ui-textarea--invalid {
  border-color: var(--color-danger-strong);
}

.ui-textarea--invalid:focus-visible {
  box-shadow: var(--ring-danger);
}

.ui-textarea:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: var(--color-paper);
}

.ui-textarea:read-only {
  background: var(--color-paper);
}
</style>
