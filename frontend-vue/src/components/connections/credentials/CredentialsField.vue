<script setup lang="ts">
// One labelled field of a credentials form: a UiField placed on the form's grid (the Angular
// `credentials-fieldset__*-columns` classes), with the "autofilled from a connection string" look,
// and an `after` slot for help that needs links or buttons (UiField's hint and error are text only).
import { computed } from 'vue';
import { UiField } from '@/components/ui';

const props = withDefaults(
	defineProps<{
		label: string;
		/** Grid columns taken: 1–3, or 'full' for the whole row. */
		span?: 1 | 2 | 3 | 'full';
		hint?: string;
		error?: string;
		required?: boolean;
		/** Filled from a pasted connection string. */
		autofilled?: boolean;
	}>(),
	{ span: 'full', required: false, autofilled: false },
);

const classes = computed(() => [
	'credentials-field',
	`credentials-field--span-${props.span}`,
	{ 'credentials-field--autofilled': props.autofilled },
]);
</script>

<template>
	<div :class="classes">
		<UiField :label="label" :hint="hint" :error="error" :required="required">
			<slot />
		</UiField>
		<slot name="after" />
	</div>
</template>

<style scoped>
.credentials-field {
	min-width: 0;
}

.credentials-field--span-1 {
	grid-column: span 1;
}

.credentials-field--span-2 {
	grid-column: span 2;
}

.credentials-field--span-3 {
	grid-column: span 3;
}

.credentials-field--span-full {
	grid-column: 1 / -1;
}

.credentials-field--autofilled :deep(.ui-field__label) {
	color: var(--color-success);
}

.credentials-field--autofilled :deep(.ui-input),
.credentials-field--autofilled :deep(.ui-textarea) {
	border-color: var(--color-success-border);
	background-color: var(--color-success-bg);
}

@media (width <= 600px) {
	.credentials-field {
		grid-column: 1 / -1;
	}
}
</style>
