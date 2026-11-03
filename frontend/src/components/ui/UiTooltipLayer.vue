<script setup lang="ts">
/**
 * The DOM the `vTooltip` directive renders into — not used directly. Mounted once, lazily, into a
 * container appended to `<body>`, the first time any host binds a tooltip.
 *
 * Two parts, following the CDK `AriaDescriber` pattern `matTooltip` used:
 *
 * - **Describer messages**: one visually hidden node per distinct tooltip text, always present, so
 *   each host's `aria-describedby` resolves the moment focus lands on it — before any bubble shows.
 *   `aria-hidden` keeps a screenreader's virtual cursor from reading the list at the end of the
 *   page; `aria-describedby` still resolves hidden nodes, which is the point.
 * - **The bubble**: the single visible tooltip, `aria-hidden` because the description is already
 *   wired. A `popover="manual"` element, like `UiMenu`'s panel, so it stacks above a modal
 *   `<dialog>` instead of underneath it.
 */
import { computed } from 'vue';
import { TOOLTIP_BUBBLE_ID, tooltipState } from './tooltipState';

const classes = computed(() => [
	'ui-tooltip',
	tooltipState.active ? `ui-tooltip--placement-${tooltipState.active.placement}` : undefined,
	{ 'ui-tooltip--measuring': tooltipState.active !== null && tooltipState.active.coords === undefined },
]);
</script>

<template>
	<div class="ui-tooltip-layer">
		<div class="ui-tooltip-layer__messages" aria-hidden="true">
			<div v-for="message in tooltipState.messages" :id="message.id" :key="message.id">{{ message.text }}</div>
		</div>
		<div
			v-show="tooltipState.active"
			:id="TOOLTIP_BUBBLE_ID"
			:class="classes"
			popover="manual"
			aria-hidden="true"
			:style="tooltipState.active?.coords"
		>
			{{ tooltipState.active?.text }}
		</div>
	</div>
</template>

<style scoped>
/* Visually hidden, not display: none — the conventional shape AT is most reliable with. */
.ui-tooltip-layer__messages {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Overrides the UA `[popover]` box (centred, inset: 0, a border and Canvas background). */
.ui-tooltip {
  position: fixed;
  inset: auto;
  z-index: var(--z-tooltip);
  max-width: min(18rem, calc(100vw - var(--space-4)));
  margin: 0;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-ink);
  color: var(--color-surface);
  font-size: var(--text-xs);
  line-height: var(--leading-snug);
  overflow-wrap: anywhere;
  box-shadow: var(--shadow-card);
  pointer-events: auto;
}

/* Rendered but unseen for the one frame between showing and measuring. */
.ui-tooltip--measuring {
  visibility: hidden;
}
</style>
