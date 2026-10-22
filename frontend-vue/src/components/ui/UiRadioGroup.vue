<script setup lang="ts" generic="T extends SelectValue">
/**
 * Group of native radio buttons — the `mat-radio-group` replacement. Put `UiRadio`s in the default
 * slot, or pass `options` for the plain case.
 *
 * A `role="radiogroup"` around native radios sharing one `name`: the browser supplies arrow-key
 * movement and the single tab stop, and AT reads "Read only, radio button, 2 of 3". Values are typed
 * (`SelectValue`), like `UiSelect` and `UiSegmented` — they are compared in JS, never stringified.
 *
 * Naming, in order: the `label` prop (rendered as the visible group caption); else the surrounding
 * `UiField`'s label, through `aria-labelledby` — a `<label for>` cannot name a group; else an
 * `aria-label` attribute from the caller. Inside a `UiField` the group also takes its hint/error
 * through `aria-describedby` and `aria-invalid`.
 *
 * `UiSegmented` is the same pattern drawn as a button bar, for two-to-four short choices.
 */
import { computed, inject, provide, useId } from 'vue';
import { FIELD_CONTEXT } from './fieldContext';
import { RADIO_CONTEXT } from './radioContext';
import type { SelectOption, SelectValue } from './selectOption';
import UiRadio from './UiRadio.vue';

const props = withDefaults(
	defineProps<{
		/** The chosen value. `undefined`/no match means nothing is chosen. */
		modelValue?: T | null;
		/** Shortcut for the plain case: one `UiRadio` per option. Ignored when the default slot is used. */
		options?: SelectOption<T>[];
		/** Visible caption and accessible name. Omit inside a `UiField`, which supplies the name. */
		label?: string;
		/** Native `name` shared by the radios. Generated when omitted; set it for form submission. */
		name?: string;
		/** Layout only: stacked (the Material default) or in a row. */
		orientation?: 'vertical' | 'horizontal';
		disabled?: boolean;
		required?: boolean;
		/** Set explicitly only when used outside a `UiField`, which otherwise supplies it. */
		invalid?: boolean;
	}>(),
	{ orientation: 'vertical', disabled: false, required: false, invalid: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [T] }>();

const field = inject(FIELD_CONTEXT, undefined);

const uid = useId();
const labelId = `${uid}-label`;
const generatedName = `${uid}-radio`;

const isInvalid = computed(() => props.invalid ?? field?.invalid.value ?? false);
const isRequired = computed(() => props.required || (field?.required.value ?? false));
const labelledBy = computed(() => (props.label ? labelId : field?.labelId));

provide(RADIO_CONTEXT, {
	name: computed(() => props.name ?? generatedName),
	selected: computed(() => props.modelValue),
	disabled: computed(() => props.disabled),
	// The radios carry `SelectValue`; the group's own `T` is what its options were declared as.
	select: (value) => emit('update:modelValue', value as T),
});

const classes = computed(() => [
	'ui-radio-group',
	`ui-radio-group--${props.orientation}`,
	{ 'ui-radio-group--disabled': props.disabled, 'ui-radio-group--invalid': isInvalid.value },
]);
</script>

<template>
	<div
		:class="classes"
		role="radiogroup"
		:aria-labelledby="labelledBy"
		:aria-describedby="field?.describedBy.value"
		:aria-invalid="isInvalid ? 'true' : undefined"
		:aria-required="isRequired ? 'true' : undefined"
		:aria-disabled="disabled ? 'true' : undefined"
	>
		<span v-if="label" :id="labelId" class="ui-radio-group__label">{{ label }}</span>
		<div class="ui-radio-group__options">
			<slot>
				<UiRadio
					v-for="(option, index) in options"
					:key="index"
					:value="option.value"
					:disabled="option.disabled"
				>
					{{ option.label }}
				</UiRadio>
			</slot>
		</div>
	</div>
</template>

<style scoped>
.ui-radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-radio-group__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-ink-soft);
}

.ui-radio-group__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ui-radio-group--horizontal .ui-radio-group__options {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
}
</style>
