import type { Directive } from 'vue';

/**
 * `v-custom-validity="message"` — sets the control's native validity message, so a widget's own
 * validation (a validator.js rule, a hex check, …) makes the enclosing `<form>` invalid the same
 * way `required` or `maxlength` do. Replaces the Angular validator directives' hook into `ngModel`.
 *
 * An empty or nullish message clears it. Applied to a `UiInput`/`UiTextarea`, it lands on the
 * native control, which is the component's root element.
 */
export const vCustomValidity: Directive<
	HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
	string | null | undefined
> = {
	mounted(el, { value }) {
		el.setCustomValidity?.(value || '');
	},
	updated(el, { value }) {
		el.setCustomValidity?.(value || '');
	},
};
