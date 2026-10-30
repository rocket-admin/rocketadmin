<script setup lang="ts">
/**
 * Modal dialog on the native `<dialog>` element.
 *
 * `showModal()` gives focus trapping, `::backdrop`, top-layer stacking (above every `z-index`
 * regardless of stacking context), Escape-to-dismiss and `inert` on the rest of the page — all
 * browser-implemented. A hand-rolled focus trap is ~60 lines of the most bug-prone code in any
 * design system, which is exactly why `@headlessui/vue` was dropped in Phase 3: its `Dialog` is a
 * JS reimplementation of `<dialog>` from before the element had support.
 *
 * `inheritAttrs: false` — the root here is a positioning wrapper, so a caller's `class` is forwarded
 * to the `<dialog>` itself, which is the box they mean. See _Foundations → Conventions_.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import UiIconButton from './UiIconButton.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		/** Visibility. Two-way via `v-model:open`, so Escape and the backdrop can close it. */
		open: boolean;
		/** Accessible name, wired through `aria-labelledby`. Required — a nameless dialog is a defect. */
		title: string;
		/** Geometry only: the dialog's max-width. `lg` fits the wide RocketAdmin dialogs (filters, row view). */
		size?: 'sm' | 'md' | 'lg';
		/** Escape and backdrop dismissal. Turn off for destructive confirms mid-flight. */
		dismissible?: boolean;
		/**
		 * Renders the panel as a `<form>`, so body fields and the footer's `type="submit"` button share
		 * one form and Enter submits. Emits `submit` (default prevented). See `AppDialogForm`.
		 */
		form?: boolean;
	}>(),
	{ size: 'sm', dismissible: true, form: false },
);

const emit = defineEmits<{ 'update:open': [boolean]; close: []; submit: [SubmitEvent] }>();

function onSubmit(event: Event) {
	event.preventDefault();
	emit('submit', event as SubmitEvent);
}

const dialog = ref<HTMLDialogElement | null>(null);
const titleId = `${useId()}-title`;

/**
 * jsdom 29 ships `HTMLDialogElement` and its `open` property but **not** `showModal()`/`close()`,
 * so both are called defensively. Without this, mounting the component under vitest throws — the
 * plan's assumption that "jsdom 29 supports `<dialog>`" does not hold for the methods.
 */
function syncOpen(shouldOpen: boolean) {
	const el = dialog.value;
	if (!el) return;
	if (shouldOpen) {
		if (!el.open) el.showModal?.();
	} else if (el.open) {
		el.close?.();
	}
}

watch(
	() => props.open,
	async (isOpen) => {
		// nextTick so the <dialog> exists on the first tick a caller mounts with `open: true`.
		await nextTick();
		syncOpen(isOpen);
	},
	{ immediate: true },
);

// Leaving a modal dialog in the top layer would keep the rest of the page inert after unmount.
onBeforeUnmount(() => {
	if (dialog.value?.open) dialog.value.close?.();
});

function requestClose() {
	emit('update:open', false);
	emit('close');
}

/**
 * The native `cancel` event fires for Escape. Cancelling it is what makes `dismissible: false`
 * real — `preventDefault()` is the only supported way to refuse Escape on a modal dialog.
 */
function onCancel(event: Event) {
	event.preventDefault();
	if (props.dismissible) requestClose();
}

/**
 * A modal `<dialog>`'s backdrop is part of the element's own box, so a click on it targets the
 * dialog rather than a separate node. Comparing the target against the element is the standard way
 * to tell "clicked the backdrop" from "clicked the panel".
 */
function onDialogClick(event: MouseEvent) {
	if (!props.dismissible) return;
	if (event.target === dialog.value) requestClose();
}

const classes = computed(() => ['ui-modal', `ui-modal--size-${props.size}`]);
</script>

<template>
	<dialog
		ref="dialog"
		v-bind="$attrs"
		:class="classes"
		:aria-labelledby="titleId"
		@cancel="onCancel"
		@click="onDialogClick"
	>
		<!-- Stops a click inside the panel from reaching the backdrop handler above. -->
		<component
			:is="form ? 'form' : 'div'"
			class="ui-modal__panel"
			:novalidate="form ? true : undefined"
			@click.stop
			@submit="onSubmit"
		>
			<header class="ui-modal__head">
				<h2 :id="titleId" class="ui-modal__title">{{ title }}</h2>
				<UiIconButton
					v-if="dismissible"
					class="ui-modal__close"
					icon="close"
					label="Close dialog"
					@click="requestClose"
				/>
			</header>

			<div class="ui-modal__body"><slot /></div>

			<footer v-if="$slots.footer" class="ui-modal__footer">
				<slot name="footer" />
			</footer>
		</component>
	</dialog>
</template>

<style scoped>
.ui-modal {
  padding: 0;
  border: none;
  background: transparent;
  /* The top layer already sits above everything; this only orders it against other top-layer
     content and documents the intent. */
  z-index: var(--z-modal);
  max-height: calc(100vh - var(--space-8));
  overflow: visible;
}

.ui-modal::backdrop {
  background: var(--color-overlay);
}

.ui-modal--size-sm {
  width: min(26rem, calc(100vw - var(--space-8)));
}

.ui-modal--size-md {
  width: min(36rem, calc(100vw - var(--space-8)));
}

.ui-modal--size-lg {
  width: min(52rem, calc(100vw - var(--space-8)));
}

.ui-modal__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border-radius: var(--radius-panel);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-card);
}

.ui-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.ui-modal__title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-snug);
  color: var(--color-ink);
}

/* A 40px hit area, pulled into the panel's padding so it doesn't push the title down or inward. */
.ui-modal__close {
  margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0;
}

.ui-modal__body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-ink-soft);
}

.ui-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
