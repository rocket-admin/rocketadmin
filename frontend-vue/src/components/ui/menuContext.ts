import type { InjectionKey } from 'vue';

/**
 * The wiring `UiMenu` hands to its `UiMenuItem` children.
 *
 * A separate module for the same reason as `tabsContext.ts`: importing the key from `UiMenu.vue`
 * into `UiMenuItem.vue` would make the two circularly dependent.
 */
export interface MenuContext {
	/** Closes the menu after an item is chosen, returning focus to the trigger. */
	close: (options?: { returnFocus?: boolean }) => void;
}

export const MENU_CONTEXT: InjectionKey<MenuContext> = Symbol('ui-menu');
