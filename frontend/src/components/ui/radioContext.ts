import type { InjectionKey, Ref } from 'vue';
import type { SelectValue } from './selectOption';

/**
 * The wiring `UiRadioGroup` hands to its `UiRadio` children. A separate module for the same reason
 * as `fieldContext.ts`: importing the key from the parent `.vue` would make them circular.
 */
export interface RadioContext {
	/** Shared native `name`, which is what gives the radios arrow-key movement and one tab stop. */
	name: Ref<string>;
	/** The group's current value. */
	selected: Ref<SelectValue | undefined>;
	/** True while the whole group is disabled. */
	disabled: Ref<boolean>;
	/** Emits `update:modelValue` on the group. */
	select: (value: SelectValue) => void;
}

export const RADIO_CONTEXT: InjectionKey<RadioContext> = Symbol('ui-radio-group');
