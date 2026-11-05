import type { InjectionKey } from 'vue';

/**
 * The wiring `UiAccordion` hands to its `UiExpansionPanel` children. A separate module for the same
 * reason as `fieldContext.ts`.
 */
export interface AccordionContext {
	/** Registers a panel's `close`, so the accordion can collapse it when a sibling opens. */
	register: (id: string, close: () => void) => void;
	unregister: (id: string) => void;
	/** Called by a panel as it opens. Without `multi`, the accordion closes every other panel. */
	opened: (id: string) => void;
}

export const ACCORDION_CONTEXT: InjectionKey<AccordionContext> = Symbol('ui-accordion');
