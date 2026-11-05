<script setup lang="ts">
/**
 * A dialog without a form: a UiModal that closes its DialogRef on Escape, backdrop and the
 * close button. Use AppDialogForm when the dialog has inputs.
 *
 * Rendered inline (not through useDialog), pass `v-model:open` like a plain UiModal.
 */
import { computed } from 'vue';
import { UiModal } from '@/components/ui';
import { useOptionalDialogRef } from '@/composables/useDialog';

const props = withDefaults(
	defineProps<{
		/** Accessible name and heading. */
		title: string;
		/** Geometry only. */
		size?: 'sm' | 'md' | 'lg';
		/** Escape, backdrop and × dismissal. */
		dismissible?: boolean;
		/** Visibility for inline use. Ignored inside useDialog(), where the dialog is open until closed. */
		open?: boolean;
	}>(),
	{ size: 'md', dismissible: true, open: undefined },
);

const emit = defineEmits<{ 'update:open': [boolean]; close: [] }>();

const dialogRef = useOptionalDialogRef();
const isOpen = computed(() => (dialogRef ? true : Boolean(props.open)));

function onClose() {
	emit('update:open', false);
	emit('close');
	dialogRef?.close();
}
</script>

<template>
	<UiModal :open="isOpen" :title="title" :size="size" :dismissible="dismissible" @close="onClose">
		<slot />
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</UiModal>
</template>
