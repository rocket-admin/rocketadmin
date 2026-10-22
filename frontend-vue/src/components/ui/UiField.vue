<script setup lang="ts">
/**
 * Label + hint + error, and the ARIA wiring between them and the control.
 *
 * Split from `UiInput` on purpose: the split is what lets a field also wrap a `<select>`, a
 * `<textarea>` or the Turnstile widget. `UiInput` picks the context up via `inject`; anything else
 * reads the same ids off the scoped default slot.
 *
 * **`aria-describedby` linking an input to its error message exists nowhere in the app today** —
 * the four hand-rolled `.field` copies render the error as an unassociated sibling `<p>`, so a
 * screenreader user hears the label and nothing about why submission failed. That single defect is
 * what justifies this component.
 *
 * Attribute fallthrough is left on (unlike `UiModal`, which forwards to its inner `<dialog>`): the
 * root here *is* the layout box, so a caller's one-off margin or width belongs on it. Attributes
 * meant for the control go on the control the caller passes into the slot.
 */
import { computed, provide, toRef, useId } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';

const props = withDefaults(
	defineProps<{
		/** Visible label text. Required — a field without one is a defect, not a style choice. */
		label: string;
		/** Supplementary text under the label, e.g. password rules or "(optional)". */
		hint?: string;
		/** Validation message. Its presence is what sets `aria-invalid` on the control. */
		error?: string;
		required?: boolean;
	}>(),
	{ required: false },
);

// useId() rather than a counter: deterministic per instance, stable across re-renders, and unique
// across two fields on one page — the regression this guards is two inputs sharing one label.
const uid = useId();
const inputId = `${uid}-input`;
const labelId = `${uid}-label`;
const hintId = `${uid}-hint`;
const errorId = `${uid}-error`;

const invalid = computed(() => Boolean(props.error));

/* Both ids when both are present — an error must not silence the hint, since the hint usually
   states the rule the error is complaining about. */
const describedBy = computed(() => {
	const ids = [props.hint ? hintId : undefined, props.error ? errorId : undefined].filter(Boolean);
	return ids.length ? ids.join(' ') : undefined;
});

provide(FIELD_CONTEXT, {
	inputId,
	labelId,
	describedBy,
	invalid,
	required: toRef(props, 'required'),
});
</script>

<template>
	<div class="ui-field">
		<label :id="labelId" class="ui-field__label" :for="inputId">
			{{ label }}
			<span v-if="required" class="ui-field__required" aria-hidden="true">*</span>
		</label>

		<!-- Scoped slot so a select/textarea/Turnstile can wire itself up identically to UiInput. -->
		<slot :input-id="inputId" :described-by="describedBy" :invalid="invalid" :required="required" />

		<p v-if="hint" :id="hintId" class="ui-field__hint">{{ hint }}</p>
		<!-- No role="alert": the error is already reachable through aria-describedby, and announcing
         it a second time on every keystroke of a live-validating form is worse than not at all. -->
		<p v-if="error" :id="errorId" class="ui-field__error">{{ error }}</p>
	</div>
</template>

<style scoped>
.ui-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.ui-field__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

/* Decorative: `required` is already on the control, where AT reads it. */
.ui-field__required {
  color: var(--color-danger-strong);
}

.ui-field__hint,
.ui-field__error {
  margin: 0;
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
}

.ui-field__hint {
  color: var(--color-muted-soft);
}

.ui-field__error {
  color: var(--color-danger);
}
</style>
