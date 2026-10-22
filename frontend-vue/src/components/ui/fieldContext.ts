import type { InjectionKey, Ref } from 'vue';

/**
 * The wiring `UiField` hands to whatever control it wraps.
 *
 * A separate module rather than a const inside `UiField.vue`, because importing the key from the
 * `.vue` file into `UiInput.vue` would make the two components circularly dependent.
 */
export interface FieldContext {
	/** Goes on the control's `id`; `UiField`'s `<label for>` already points at it. */
	inputId: string;
	/**
	 * Id of `UiField`'s visible `<label>`. For group controls (`UiRadioGroup`) that `<label for>`
	 * cannot name: they point `aria-labelledby` here instead. Optional so a hand-built context in a
	 * test or story still type-checks.
	 */
	labelId?: string;
	/** Space-joined ids of the hint and error nodes, or `undefined` when there are none. */
	describedBy: Ref<string | undefined>;
	/** True while the field carries an error, for `aria-invalid`. */
	invalid: Ref<boolean>;
	required: Ref<boolean>;
}

export const FIELD_CONTEXT: InjectionKey<FieldContext> = Symbol('ui-field');
