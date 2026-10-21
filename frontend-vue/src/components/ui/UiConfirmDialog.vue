<script setup lang="ts">
/**
 * Confirmation prompt for a destructive or irreversible action, replacing `window.confirm()`.
 *
 * `window.confirm` blocks the main thread, cannot be styled or branded, renders a browser-chrome
 * string with no room for context, and gives the user no "working…" state — so a slow delete looks
 * frozen. It is also suppressible per-origin in most browsers, which silently turns a guarded
 * action into an unguarded one.
 *
 * Dismissal is disabled while `busy`: Escape or a backdrop click mid-request would hide the dialog
 * while the operation it describes is still in flight.
 *
 * The default slot takes options that qualify the action itself — an opt-in for a second,
 * wider-reaching deletion, say. Keep it to decisions the confirm button carries out; anything the
 * user would navigate away to do belongs on the page, not in a modal they must dismiss to reach it.
 */
import { computed } from 'vue';
import UiButton from './UiButton.vue';
import UiModal from './UiModal.vue';

const props = withDefaults(
	defineProps<{
		/** Visibility. Two-way via `v-model:open`. */
		open: boolean;
		/** The question, e.g. `Delete "My site"?`. Becomes the dialog's accessible name. */
		title: string;
		/** Consequence text under the title. Say what is irreversible. */
		message: string;
		/** Confirm button label. Prefer the verb — "Delete" beats "OK". */
		confirmLabel?: string;
		/** Cancel button label. */
		cancelLabel?: string;
		/** Confirm button emphasis. `danger` for anything destructive. */
		tone?: 'danger' | 'accent';
		/** Request in flight: spins the confirm button and locks dismissal. */
		busy?: boolean;
	}>(),
	{ confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'danger', busy: false },
);

const emit = defineEmits<{ 'update:open': [boolean]; confirm: []; cancel: [] }>();

/** `tone` is status vocabulary; `UiButton` speaks `variant`. Mapped here so neither leaks. */
const confirmVariant = computed(() => (props.tone === 'danger' ? 'danger' : 'primary'));

function onCancel() {
	if (props.busy) return;
	emit('update:open', false);
	emit('cancel');
}
</script>

<template>
	<UiModal
		:open="open"
		:title="title"
		size="sm"
		:dismissible="!busy"
		@update:open="!$event && onCancel()"
	>
		<p class="ui-confirm-dialog__message">{{ message }}</p>

		<!-- Extra decisions that belong to this confirmation — an opt-in checkbox for a second,
         wider-reaching deletion, say. Empty in the common case, so nothing renders and the
         dialog stays the plain question it was. -->
		<div v-if="$slots.default" class="ui-confirm-dialog__extra"><slot /></div>

		<template #footer>
			<UiButton variant="secondary" :disabled="busy" @click="onCancel">{{ cancelLabel }}</UiButton>
			<UiButton :variant="confirmVariant" :loading="busy" @click="emit('confirm')">
				{{ confirmLabel }}
			</UiButton>
		</template>
	</UiModal>
</template>

<style scoped>
.ui-confirm-dialog__message {
  margin: 0;
}

.ui-confirm-dialog__extra {
  margin-top: var(--space-4);
}
</style>
