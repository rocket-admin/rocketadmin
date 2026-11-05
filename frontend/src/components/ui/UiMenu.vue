<script setup lang="ts">
/**
 * Dropdown menu — the `mat-menu` replacement (account menu, connection switcher, row actions).
 * Implements the APG menu-button pattern; put `UiMenuItem`s in the default slot.
 *
 * The trigger is the caller's own control, rendered through the scoped `trigger` slot: spread
 * `triggerProps` onto it (`<UiIconButton v-bind="triggerProps" … />`) and it gains the id,
 * `aria-haspopup`/`aria-expanded`/`aria-controls` and the click/keydown handlers. A slot rather than
 * a built-in button because the triggers genuinely differ — an icon button in the header, a text
 * button with a caret for the connection switcher.
 *
 * Keyboard: Enter/Space/ArrowDown on the trigger open it on the first item, ArrowUp on the last;
 * inside, arrows/Home/End move (wrapping), a printable key jumps to the next item starting with it,
 * Escape closes and returns focus to the trigger, Tab closes and lets focus move on. Choosing an item
 * or clicking outside closes it.
 *
 * **Positioning.** The panel is a `popover="manual"` element shown with `showPopover()`, which puts
 * it in the top layer: it escapes `overflow: hidden` table wrappers and transformed ancestors (the
 * drawer), and still stacks correctly inside a modal `<dialog>`, which a `<Teleport to="body">` would
 * render *underneath*. "Manual" because the auto popover's light-dismiss also fires on a trigger
 * click, which would re-open the menu it just closed. Coordinates are measured from the trigger and
 * applied inline — like UiSkeleton's width, dynamic geometry no token can express. jsdom has no
 * popover API, so the calls are defensive and `v-show` is what actually hides the panel there.
 */
import { computed, nextTick, onBeforeUnmount, provide, ref, useId, watch } from 'vue';
import { MENU_CONTEXT } from './menuContext';

const props = withDefaults(
	defineProps<{
		/** Accessible name for the menu. Omitted, the menu is labelled by its trigger. */
		label?: string;
		/** Which edge of the trigger the panel lines up with. `end` for triggers at the toolbar's end. */
		align?: 'start' | 'end';
		/** Disables the trigger (forwarded through `triggerProps`) and refuses to open. */
		disabled?: boolean;
	}>(),
	{ align: 'start', disabled: false },
);

/** Visibility. Optional two-way `v-model:open`; uncontrolled when not bound. */
const open = defineModel<boolean>('open', { default: false });

const uid = useId();
const triggerId = `${uid}-trigger`;
const menuId = `${uid}-menu`;

const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const coords = ref<{ top: string; left: string } | undefined>(undefined);
let triggerEl: HTMLElement | null = null;

/** Gap between trigger and panel, in px — `--space-1`. Measured geometry, so it can't read the token. */
const OFFSET = 4;

const triggerProps = computed(() => ({
	id: triggerId,
	'aria-haspopup': 'menu' as const,
	'aria-expanded': open.value ? ('true' as const) : ('false' as const),
	'aria-controls': menuId,
	disabled: props.disabled,
	onClick: onTriggerClick,
	onKeydown: onTriggerKeydown,
}));

provide(MENU_CONTEXT, { close });

watch(open, async (isOpen) => {
	if (isOpen) {
		await nextTick();
		show();
	} else {
		hide();
	}
});

onBeforeUnmount(() => hide());

async function openMenu(focus: 'first' | 'last') {
	if (props.disabled) return;
	open.value = true;
	await nextTick();
	show();
	focusItem(focus);
}

function close(options: { returnFocus?: boolean } = {}) {
	if (!open.value) return;
	open.value = false;
	hide();
	if (options.returnFocus) (triggerEl ?? document.getElementById(triggerId))?.focus();
}

function onTriggerClick(event: MouseEvent) {
	triggerEl = event.currentTarget as HTMLElement;
	if (open.value) close();
	else openMenu('first');
}

function onTriggerKeydown(event: KeyboardEvent) {
	triggerEl = event.currentTarget as HTMLElement;
	const nativeButton = event.currentTarget instanceof HTMLButtonElement;
	if (event.key === 'ArrowDown' || (!nativeButton && (event.key === 'Enter' || event.key === ' '))) {
		event.preventDefault();
		openMenu('first');
	} else if (event.key === 'ArrowUp') {
		event.preventDefault();
		openMenu('last');
	} else if (event.key === 'Escape' && open.value) {
		event.preventDefault();
		close();
	}
}

function onMenuKeydown(event: KeyboardEvent) {
	const list = items();
	const current = list.indexOf(document.activeElement as HTMLElement);

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			list[(current + 1) % list.length]?.focus();
			return;
		case 'ArrowUp':
			event.preventDefault();
			list[(current - 1 + list.length) % list.length]?.focus();
			return;
		case 'Home':
			event.preventDefault();
			focusItem('first');
			return;
		case 'End':
			event.preventDefault();
			focusItem('last');
			return;
		case 'Escape':
			event.preventDefault();
			// A menu inside a UiModal must not also dismiss the dialog.
			event.stopPropagation();
			close({ returnFocus: true });
			return;
		case 'Tab':
			// No preventDefault: focus moves on to the control after the trigger, as APG specifies.
			close();
			return;
	}

	if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey)
		typeahead(event.key, list, current);
}

/** A pointerdown anywhere outside trigger + panel dismisses, without stealing focus back. */
function onDocumentPointerdown(event: PointerEvent) {
	if (root.value && !root.value.contains(event.target as Node)) close();
}

function show() {
	const el = panel.value;
	if (!el) return;
	if (!el.matches?.(':popover-open')) callPopover(el, 'showPopover');
	place();
	document.addEventListener('pointerdown', onDocumentPointerdown, true);
	window.addEventListener('resize', place);
	window.addEventListener('scroll', place, true);
}

function hide() {
	const el = panel.value;
	if (el?.matches?.(':popover-open')) callPopover(el, 'hidePopover');
	document.removeEventListener('pointerdown', onDocumentPointerdown, true);
	window.removeEventListener('resize', place);
	window.removeEventListener('scroll', place, true);
}

/** Below the trigger, flipped above when it would overflow the viewport and there is room above. */
function place() {
	const anchor = triggerEl ?? document.getElementById(triggerId) ?? root.value;
	const el = panel.value;
	if (!anchor || !el) return;

	const rect = anchor.getBoundingClientRect();
	const { offsetWidth: width, offsetHeight: height } = el;
	let top = rect.bottom + OFFSET;
	if (top + height > window.innerHeight && rect.top - OFFSET - height >= 0) top = rect.top - OFFSET - height;

	const rtl = getComputedStyle(anchor).direction === 'rtl';
	const alignEnd = (props.align === 'end') !== rtl;
	const left = alignEnd ? rect.right - width : rect.left;
	const clamped = Math.max(OFFSET, Math.min(left, window.innerWidth - width - OFFSET));

	coords.value = { top: `${top}px`, left: `${clamped}px` };
}

function items(): HTMLElement[] {
	const all = panel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [];
	return Array.from(all).filter((item) => item.getAttribute('aria-disabled') !== 'true');
}

function focusItem(which: 'first' | 'last') {
	const list = items();
	(which === 'first' ? list[0] : list[list.length - 1])?.focus();
}

function typeahead(key: string, list: HTMLElement[], current: number) {
	const needle = key.toLowerCase();
	for (let step = 1; step <= list.length; step++) {
		const candidate = list[(current + step) % list.length];
		if (candidate?.textContent?.trim().toLowerCase().startsWith(needle)) {
			candidate.focus();
			return;
		}
	}
}

/** The popover API is missing in jsdom and older browsers; `v-show` still hides the panel there. */
function callPopover(el: HTMLElement, method: 'showPopover' | 'hidePopover') {
	const fn = (el as Partial<Pick<HTMLElement, 'showPopover' | 'hidePopover'>>)[method];
	try {
		fn?.call(el);
	} catch {
		// Already in the requested state, or detached mid-transition — nothing to undo.
	}
}
</script>

<template>
	<div ref="root" class="ui-menu">
		<slot name="trigger" :trigger-props="triggerProps" :open="open" />
		<div
			v-show="open"
			:id="menuId"
			ref="panel"
			class="ui-menu__panel"
			role="menu"
			aria-orientation="vertical"
			:aria-label="label"
			:aria-labelledby="label ? undefined : triggerId"
			popover="manual"
			:style="coords"
			@keydown="onMenuKeydown"
		>
			<slot />
		</div>
	</div>
</template>

<style scoped>
.ui-menu {
  display: inline-flex;
}

/* Overrides the UA `[popover]` box (centred, inset: 0, a border and Canvas background). */
.ui-menu__panel {
  position: fixed;
  inset: auto;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  min-width: 12rem;
  max-width: min(22rem, calc(100vw - var(--space-4)));
  max-height: min(24rem, calc(100vh - var(--space-8)));
  margin: 0;
  padding: var(--space-1);
  overflow-y: auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--color-ink);
  box-shadow: var(--shadow-card);
}
</style>
