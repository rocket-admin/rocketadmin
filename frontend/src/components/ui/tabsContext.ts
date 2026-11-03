import type { InjectionKey, Ref } from 'vue';

/**
 * The wiring `UiTabs` hands to its `UiTab` and `UiTabPanel` children.
 *
 * A separate module rather than a const inside `UiTabs.vue`, for the same reason as
 * `fieldContext.ts`: importing the key from the parent `.vue` into the children would make them
 * circularly dependent.
 */
export interface TabsContext {
	/** The selected tab's `value`. */
	selected: Ref<string>;
	/** Selects a tab and emits `update:modelValue` on the parent. */
	select: (value: string) => void;
	/** Registers a tab so keyboard navigation knows the DOM order and which entries are disabled. */
	register: (value: string, disabled: Ref<boolean>) => void;
	unregister: (value: string) => void;
	/** Moves selection and focus relative to the current tab, skipping disabled ones. */
	moveFocus: (from: string, direction: 'next' | 'prev' | 'first' | 'last') => void;
	/** Derives the shared id pair so a tab and its panel can point at each other. */
	tabId: (value: string) => string;
	panelId: (value: string) => string;
}

export const TABS_CONTEXT: InjectionKey<TabsContext> = Symbol('ui-tabs');
