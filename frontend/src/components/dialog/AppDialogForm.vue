<script setup lang="ts">
/**
 * The dialog-with-a-form pattern (CLAUDE.md): fields and actions share one `<form>`, the primary
 * action is `type="submit"`, so Enter submits and validation runs before `submit` is emitted.
 *
 * ```vue
 * <AppDialogForm title="Rename table" submit-label="Rename" :busy="saving" @submit="save">
 *   <UiField label="Name" v-slot="field"><UiInput v-model="name" v-bind="field" required /></UiField>
 * </AppDialogForm>
 * ```
 *
 * Cancel, Escape and the backdrop close the DialogRef with no result.
 */
import { computed } from 'vue';
import { UiButton, UiModal } from '@/components/ui';
import { useOptionalDialogRef } from '@/composables/useDialog';

const props = withDefaults(
	defineProps<{
		/** Accessible name and heading. */
		title: string;
		/** Primary action label. Prefer the verb ("Save", "Add user"). */
		submitLabel?: string;
		/** Cancel button label. */
		cancelLabel?: string;
		/** Primary action emphasis. */
		submitVariant?: 'primary' | 'danger';
		/** Request in flight: spins the submit button and locks dismissal. */
		busy?: boolean;
		/** Disables the submit button, e.g. while the form is invalid. */
		disabled?: boolean;
		/** Geometry only. */
		size?: 'sm' | 'md' | 'lg';
		/** Escape and backdrop dismissal (the `disableClose: true` of MatDialog when off). Always off while busy. */
		dismissible?: boolean;
		/** Visibility for inline use. Ignored inside useDialog(). */
		open?: boolean;
	}>(),
	{
		submitLabel: 'Save',
		cancelLabel: 'Cancel',
		submitVariant: 'primary',
		busy: false,
		disabled: false,
		size: 'md',
		dismissible: true,
		open: undefined,
	},
);

const emit = defineEmits<{ submit: [SubmitEvent]; cancel: []; 'update:open': [boolean] }>();

const dialogRef = useOptionalDialogRef();
const isOpen = computed(() => (dialogRef ? true : Boolean(props.open)));

function onCancel() {
	if (props.busy) return;
	emit('update:open', false);
	emit('cancel');
	dialogRef?.close();
}

function onSubmit(event: SubmitEvent) {
	if (props.busy || props.disabled) return;
	const form = event.target as HTMLFormElement;
	// `novalidate` stops the browser's bubbles, so the constraint check runs here instead.
	if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
	emit('submit', event);
}
</script>

<template>
	<UiModal
		:open="isOpen"
		:title="title"
		:size="size"
		:dismissible="dismissible && !busy"
		form
		@close="onCancel"
		@submit="onSubmit"
	>
		<slot />
		<template #footer>
			<slot name="actions" />
			<UiButton variant="secondary" :disabled="busy" @click="onCancel">{{ cancelLabel }}</UiButton>
			<UiButton type="submit" :variant="submitVariant" :loading="busy" :disabled="disabled">
				{{ submitLabel }}
			</UiButton>
		</template>
	</UiModal>
</template>
