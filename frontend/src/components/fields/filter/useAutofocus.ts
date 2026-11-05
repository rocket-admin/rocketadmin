/**
 * The `autofocus` input of `BaseFilterFieldComponent`: every Angular filter focused its control in
 * `ngAfterViewInit` through `setTimeout(…, 100)`, late enough for the dialog's open animation and
 * the saved-filters panel to have settled. Same delay here.
 */
import { type ComponentPublicInstance, onBeforeUnmount, onMounted, type Ref } from 'vue';

export const AUTOFOCUS_DELAY = 100;

/** A template ref: a native element, a primitive whose root is the control, or one exposing `focus()`. */
export type FocusTarget = ComponentPublicInstance | HTMLElement | null | undefined;

export function useAutofocus(props: { autofocus?: boolean }, target: Ref<FocusTarget>): void {
	let timer: ReturnType<typeof setTimeout> | undefined;

	onMounted(() => {
		if (!props.autofocus) return;
		timer = setTimeout(() => focusTarget(target.value), AUTOFOCUS_DELAY);
	});

	onBeforeUnmount(() => clearTimeout(timer));
}

const FOCUSABLE = 'input, select, textarea, button, [tabindex]';

export function focusTarget(target: FocusTarget): void {
	if (!target) return;
	if (target instanceof HTMLElement) {
		focusElement(target);
		return;
	}
	const exposed = (target as { focus?: unknown }).focus;
	if (typeof exposed === 'function') {
		exposed();
		return;
	}
	if (target.$el instanceof HTMLElement) focusElement(target.$el);
}

/** The element itself when it is a control, else its first control (a segmented group's radio). */
function focusElement(el: HTMLElement): void {
	const control = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
	control?.focus();
}
