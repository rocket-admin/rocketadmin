import { reactive } from 'vue';

/** Where the bubble sits relative to its host. Logical sides are not needed: tooltips never mirror. */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/** One describer node: the text a host's `aria-describedby` resolves to. Shared by equal texts. */
export interface TooltipMessage {
	id: string;
	text: string;
}

/** The tooltip currently on screen. At most one exists — showing another replaces it. */
export interface ActiveTooltip {
	text: string;
	/** The side actually used, after flipping away from a viewport edge. */
	placement: TooltipPlacement;
	/** Measured `position: fixed` coordinates; `undefined` until the bubble has been measured. */
	coords: { top: string; left: string } | undefined;
}

/**
 * Shared between the `vTooltip` directive (which writes it) and `UiTooltipLayer` (which renders
 * it). A separate module for the same reason as `fieldContext.ts`: importing it from the `.vue`
 * file into `tooltip.ts`, which also imports that `.vue` file, would be circular.
 */
export const tooltipState = reactive<{ messages: TooltipMessage[]; active: ActiveTooltip | null }>({
	messages: [],
	active: null,
});

/** Id of the single visual bubble, so the directive can measure and pop it into the top layer. */
export const TOOLTIP_BUBBLE_ID = 'ui-tooltip-bubble';
