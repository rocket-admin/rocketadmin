import { type Directive, type DirectiveBinding, h, nextTick, render } from 'vue';
import { TOOLTIP_BUBBLE_ID, type TooltipPlacement, tooltipState } from './tooltipState';
import UiTooltipLayer from './UiTooltipLayer.vue';

/**
 * `v-tooltip` — the `matTooltip` replacement.
 *
 * ```vue
 * <UiIconButton v-tooltip="'Delete row'" … />
 * <span v-tooltip:left="fullName">{{ shortName }}</span>
 * <UiButton v-tooltip.top="disabled ? 'Select sort order first' : ''" … />
 * ```
 *
 * The value is the text; an empty string, `false`, `null` or `undefined` disables the tooltip
 * (and removes the host's `aria-describedby` token), which is how `[matTooltip]="cond ? 'x' : ''"`
 * ports. Placement comes from the argument or a modifier — `v-tooltip:left` / `v-tooltip.left` —
 * defaulting to `bottom` (Material's `below`); it flips to the opposite side when it would leave
 * the viewport.
 *
 * A directive rather than a `UiTooltip` wrapper component: 99 `matTooltip`s sit on existing
 * elements (icon buttons, table cells, truncated labels), and a wrapper would add a DOM node and
 * break `:first-child` / flex layouts at every one of them.
 *
 * Accessibility: the host gets `aria-describedby` pointing at an always-present describer node
 * (see `UiTooltipLayer`), so the text is announced on focus. It shows on hover and on focus, and
 * hides on pointer leave, blur, Escape and scroll. Per WCAG 1.4.13 the pointer may move onto the
 * bubble without it disappearing. On a `UiIconButton`, whose `label` already is the accessible
 * name and native `title`, a tooltip with the same words adds nothing — use it only for extra text.
 *
 * Known limit, shared with `matTooltip`: a natively `disabled` button fires no pointer events, so
 * its tooltip only shows if it is bound to a wrapper element instead.
 */

/** Values the directive accepts. Anything falsy means "no tooltip". */
export type TooltipValue = string | false | null | undefined;

const PLACEMENTS: readonly TooltipPlacement[] = ['top', 'bottom', 'left', 'right'];

/** Gap between host and bubble, and minimum distance from the viewport edge, in px (`--space-2`). */
const OFFSET = 8;
/** Grace period after the pointer leaves the host, so it can travel onto the bubble (WCAG 1.4.13). */
const HIDE_DELAY = 100;

interface HostState {
	text: string;
	placement: TooltipPlacement;
	/** The describer node id currently in this host's `aria-describedby`. */
	messageId: string | undefined;
	hideTimer: ReturnType<typeof setTimeout> | undefined;
	listeners: Array<[string, EventListener]>;
}

const hosts = new WeakMap<HTMLElement, HostState>();
/** Which host the visible bubble belongs to. */
let activeHost: HTMLElement | null = null;
let layerContainer: HTMLElement | null = null;
let messageCounter = 0;
/** Describer nodes are shared by equal texts and dropped when no host uses them any more. */
const messageUse = new Map<string, { id: string; count: number }>();

export const vTooltip: Directive<HTMLElement, TooltipValue> = {
	mounted(el, binding) {
		ensureLayer();
		const state: HostState = {
			text: '',
			placement: placementOf(binding),
			messageId: undefined,
			hideTimer: undefined,
			listeners: [
				['pointerenter', () => show(el)],
				['pointerleave', () => scheduleHide(el)],
				['focusin', () => show(el)],
				['focusout', () => hide(el)],
			],
		};
		hosts.set(el, state);
		for (const [type, listener] of state.listeners) el.addEventListener(type, listener);
		setText(el, state, textOf(binding.value));
	},

	updated(el, binding) {
		const state = hosts.get(el);
		if (!state) return;
		state.placement = placementOf(binding);
		setText(el, state, textOf(binding.value));
		if (activeHost === el) {
			if (state.text) place(el, state);
			else hide(el);
		}
	},

	beforeUnmount(el) {
		const state = hosts.get(el);
		if (!state) return;
		if (activeHost === el) hide(el);
		clearTimeout(state.hideTimer);
		for (const [type, listener] of state.listeners) el.removeEventListener(type, listener);
		setText(el, state, '');
		hosts.delete(el);
	},
};

function textOf(value: TooltipValue): string {
	return typeof value === 'string' ? value.trim() : '';
}

function placementOf(binding: DirectiveBinding<TooltipValue>): TooltipPlacement {
	const fromArg = PLACEMENTS.find((placement) => placement === binding.arg);
	const fromModifier = PLACEMENTS.find((placement) => binding.modifiers[placement]);
	return fromArg ?? fromModifier ?? 'bottom';
}

/** Mounts `UiTooltipLayer` once, and again if a test or a host page cleared `<body>`. */
function ensureLayer() {
	if (layerContainer?.isConnected) return;
	if (!layerContainer) {
		layerContainer = document.createElement('div');
		layerContainer.className = 'ui-tooltip-root';
		render(h(UiTooltipLayer), layerContainer);
	}
	document.body.appendChild(layerContainer);
}

/** Swaps the host's describer token for the one matching `text`, keeping any caller-set ids. */
function setText(el: HTMLElement, state: HostState, text: string) {
	if (text === state.text && (text === '' || state.messageId)) return;
	if (state.messageId) {
		removeDescribedBy(el, state.messageId);
		releaseMessage(state.text);
		state.messageId = undefined;
	}
	state.text = text;
	if (text) {
		state.messageId = acquireMessage(text);
		addDescribedBy(el, state.messageId);
	}
}

function acquireMessage(text: string): string {
	const existing = messageUse.get(text);
	if (existing) {
		existing.count++;
		return existing.id;
	}
	const id = `ui-tooltip-message-${++messageCounter}`;
	messageUse.set(text, { id, count: 1 });
	tooltipState.messages.push({ id, text });
	return id;
}

function releaseMessage(text: string) {
	const entry = messageUse.get(text);
	if (!entry) return;
	entry.count--;
	if (entry.count > 0) return;
	messageUse.delete(text);
	const index = tooltipState.messages.findIndex((message) => message.id === entry.id);
	if (index !== -1) tooltipState.messages.splice(index, 1);
}

function addDescribedBy(el: HTMLElement, id: string) {
	const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
	if (!ids.includes(id)) el.setAttribute('aria-describedby', [...ids, id].join(' '));
}

function removeDescribedBy(el: HTMLElement, id: string) {
	const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((token) => token && token !== id);
	if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
	else el.removeAttribute('aria-describedby');
}

function show(el: HTMLElement) {
	const state = hosts.get(el);
	if (!state) return;
	clearTimeout(state.hideTimer);
	if (!state.text) return;
	if (activeHost && activeHost !== el) hide(activeHost);
	ensureLayer();
	activeHost = el;
	tooltipState.active = { text: state.text, placement: state.placement, coords: undefined };
	document.addEventListener('keydown', onDocumentKeydown, true);
	window.addEventListener('scroll', onScroll, true);
	bubble()?.addEventListener('pointerenter', onBubbleEnter);
	bubble()?.addEventListener('pointerleave', onBubbleLeave);
	place(el, state);
}

function hide(el: HTMLElement) {
	const state = hosts.get(el);
	if (state) clearTimeout(state.hideTimer);
	if (activeHost !== el) return;
	activeHost = null;
	tooltipState.active = null;
	document.removeEventListener('keydown', onDocumentKeydown, true);
	window.removeEventListener('scroll', onScroll, true);
	const bubbleEl = bubble();
	bubbleEl?.removeEventListener('pointerenter', onBubbleEnter);
	bubbleEl?.removeEventListener('pointerleave', onBubbleLeave);
	if (bubbleEl) callPopover(bubbleEl, 'hidePopover');
}

function scheduleHide(el: HTMLElement) {
	const state = hosts.get(el);
	if (!state) return;
	clearTimeout(state.hideTimer);
	state.hideTimer = setTimeout(() => hide(el), HIDE_DELAY);
}

function onBubbleEnter() {
	if (activeHost) clearTimeout(hosts.get(activeHost)?.hideTimer);
}

function onBubbleLeave() {
	if (activeHost) scheduleHide(activeHost);
}

function onDocumentKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && activeHost) hide(activeHost);
}

function onScroll() {
	if (activeHost) hide(activeHost);
}

function bubble(): HTMLElement | null {
	return document.getElementById(TOOLTIP_BUBBLE_ID);
}

/** Measures the rendered bubble, flips it off a viewport edge, and clamps it inside the viewport. */
async function place(el: HTMLElement, state: HostState) {
	await nextTick();
	const bubbleEl = bubble();
	if (activeHost !== el || !bubbleEl || !tooltipState.active) return;
	// Re-showing moves it to the top of the top-layer stack, above a dialog opened since.
	callPopover(bubbleEl, 'hidePopover');
	callPopover(bubbleEl, 'showPopover');

	const rect = el.getBoundingClientRect();
	const { offsetWidth: width, offsetHeight: height } = bubbleEl;
	const fits: Record<TooltipPlacement, boolean> = {
		top: rect.top - OFFSET - height >= 0,
		bottom: rect.bottom + OFFSET + height <= window.innerHeight,
		left: rect.left - OFFSET - width >= 0,
		right: rect.right + OFFSET + width <= window.innerWidth,
	};
	const opposite: Record<TooltipPlacement, TooltipPlacement> = {
		top: 'bottom',
		bottom: 'top',
		left: 'right',
		right: 'left',
	};
	const placement =
		!fits[state.placement] && fits[opposite[state.placement]] ? opposite[state.placement] : state.placement;

	let top: number;
	let left: number;
	if (placement === 'top' || placement === 'bottom') {
		top = placement === 'top' ? rect.top - OFFSET - height : rect.bottom + OFFSET;
		left = rect.left + rect.width / 2 - width / 2;
	} else {
		top = rect.top + rect.height / 2 - height / 2;
		left = placement === 'left' ? rect.left - OFFSET - width : rect.right + OFFSET;
	}
	left = Math.max(OFFSET, Math.min(left, window.innerWidth - width - OFFSET));
	top = Math.max(OFFSET, Math.min(top, window.innerHeight - height - OFFSET));

	tooltipState.active = { text: state.text, placement, coords: { top: `${top}px`, left: `${left}px` } };
}

/** The popover API is missing in jsdom and older browsers; `v-show` still hides the bubble there. */
function callPopover(el: HTMLElement, method: 'showPopover' | 'hidePopover') {
	const fn = (el as Partial<Pick<HTMLElement, 'showPopover' | 'hidePopover'>>)[method];
	try {
		fn?.call(el);
	} catch {
		// Already in the requested state — nothing to undo.
	}
}
