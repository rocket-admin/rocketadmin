<script setup lang="ts">
/**
 * Side navigation drawer — the `mat-sidenav mode="over"` replacement. Slides in from the inline-start
 * edge over a `--color-overlay` backdrop.
 *
 * Built on the native `<dialog>` with `showModal()`, for the same reasons as UiModal: the browser
 * supplies the focus trap, `inert` on the rest of the page, top-layer stacking, Escape (as the
 * `cancel` event) and the `::backdrop`. The drawer *is* modal while open — nothing behind it is
 * reachable — so the semantics are honest.
 *
 * Focus: `showModal()` focuses the first focusable element inside; if there is none (or the browser
 * doesn't), the panel itself takes focus. On close, focus returns to whatever had it before opening
 * — normally the menu button — which browsers do natively and this restores explicitly for those
 * that don't.
 *
 * The slide is a `translate` transition with `@starting-style`; the open state ends on
 * `translate: none` rather than `0`, because any other value makes the drawer a containing block and
 * would mis-position fixed descendants. `base.css`'s reduced-motion guard neutralises the slide.
 *
 * `inheritAttrs: false` — a caller's `class` lands on the `<dialog>`, the box they mean.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		/** Visibility. Two-way via `v-model:open`, so Escape and the backdrop can close it. */
		open: boolean;
		/** Accessible name for the drawer, e.g. "Main navigation". Required — a nameless dialog is a defect. */
		label: string;
		/** Geometry only: the panel width (16 / 20 / 24rem, capped to the viewport). */
		size?: 'sm' | 'md' | 'lg';
	}>(),
	{ size: 'md' },
);

const emit = defineEmits<{ 'update:open': [boolean]; close: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

const classes = computed(() => ['ui-drawer', `ui-drawer--size-${props.size}`]);

watch(
	() => props.open,
	async (isOpen) => {
		await nextTick();
		syncOpen(isOpen);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (dialog.value?.open) dialog.value.close?.();
});

function requestClose() {
	emit('update:open', false);
	emit('close');
}

/** Escape arrives as the native `cancel` event; prevented so the prop, not the browser, closes it. */
function onCancel(event: Event) {
	event.preventDefault();
	requestClose();
}

/** The backdrop is part of the `<dialog>`'s own box, so a click on it targets the dialog itself. */
function onDialogClick(event: MouseEvent) {
	if (event.target === dialog.value) requestClose();
}

/** jsdom has `HTMLDialogElement` but no `showModal()`/`close()`, hence the optional calls. */
function syncOpen(shouldOpen: boolean) {
	const el = dialog.value;
	if (!el) return;
	if (shouldOpen && !el.open) {
		returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		el.showModal?.();
		if (!el.contains(document.activeElement)) focusFirst(el);
	} else if (!shouldOpen && el.open) {
		el.close?.();
		restoreFocus(el);
	}
}

function focusFirst(el: HTMLDialogElement) {
	const target = el.querySelector<HTMLElement>(
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
	);
	(target ?? el.querySelector<HTMLElement>('.ui-drawer__panel'))?.focus();
}

function restoreFocus(el: HTMLDialogElement) {
	const target = returnFocusTo;
	returnFocusTo = null;
	// Only if focus is still inside the drawer or was dropped on <body>: a caller that already moved
	// focus somewhere deliberate (a route change focusing a heading) wins.
	const active = document.activeElement;
	if (target?.isConnected && (!active || active === document.body || el.contains(active))) target.focus();
}
</script>

<template>
	<dialog
		ref="dialog"
		v-bind="$attrs"
		:class="classes"
		:aria-label="label"
		@cancel="onCancel"
		@click="onDialogClick"
	>
		<div class="ui-drawer__panel" tabindex="-1" @click.stop>
			<header v-if="$slots.header" class="ui-drawer__header">
				<slot name="header" />
			</header>
			<div class="ui-drawer__body"><slot /></div>
			<footer v-if="$slots.footer" class="ui-drawer__footer">
				<slot name="footer" />
			</footer>
		</div>
	</dialog>
</template>

<style scoped>
.ui-drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  inset-inline-end: auto;
  max-width: calc(100vw - var(--space-12));
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  overflow: visible;
  z-index: var(--z-modal);
  translate: none;
  transition:
    translate var(--motion-slow) var(--ease-out),
    overlay var(--motion-slow) allow-discrete,
    display var(--motion-slow) allow-discrete;
}

.ui-drawer:not([open]) {
  translate: -100%;
}

.ui-drawer:dir(rtl):not([open]) {
  translate: 100%;
}

@starting-style {
  .ui-drawer[open] {
    translate: -100%;
  }

  .ui-drawer[open]:dir(rtl) {
    translate: 100%;
  }
}

.ui-drawer::backdrop {
  background: var(--color-overlay);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    overlay var(--motion-slow) allow-discrete,
    display var(--motion-slow) allow-discrete;
}

.ui-drawer:not([open])::backdrop {
  opacity: 0;
}

@starting-style {
  .ui-drawer[open]::backdrop {
    opacity: 0;
  }
}

.ui-drawer--size-sm {
  width: 16rem;
}

.ui-drawer--size-md {
  width: 20rem;
}

.ui-drawer--size-lg {
  width: 24rem;
}

.ui-drawer__panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-card);
  color: var(--color-ink);
  outline: none;
}

.ui-drawer__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--header-height);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-line);
}

.ui-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-2);
}

.ui-drawer__footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-line);
}
</style>
