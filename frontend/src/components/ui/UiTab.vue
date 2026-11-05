<script setup lang="ts">
/**
 * One tab in a `UiTabs` list. Must be placed in the parent's `tabs` slot.
 *
 * Carries the ARIA a bare `<button>` in a `role="tablist"` is missing: `role="tab"`,
 * `aria-selected`, and `aria-controls` pointing at its panel.
 */
import { computed, inject, onBeforeUnmount, onMounted, toRef } from 'vue';
import { TABS_CONTEXT } from './tabsContext';

const props = withDefaults(
	defineProps<{
		/** Identifies this tab. Matches the parent's `modelValue` and its `UiTabPanel`'s `value`. */
		value: string;
		/** Skipped by Arrow/Home/End navigation and not selectable. */
		disabled?: boolean;
		/**
		 * Id of the region this tab controls, when it is not a sibling `UiTabPanel`.
		 *
		 * For the mode-switch shape: several tabs re-configuring one shared region rather than
		 * revealing separate panels. `aria-controls` must still resolve to a real element, so pass the
		 * shared region's id here instead of leaving it pointing at a panel that was never rendered.
		 */
		controls?: string;
	}>(),
	{ disabled: false },
);

const tabs = inject(TABS_CONTEXT);
if (!tabs) throw new Error('[UiTab] must be used inside a UiTabs `tabs` slot.');

const disabledRef = toRef(props, 'disabled');
onMounted(() => tabs.register(props.value, disabledRef));
onBeforeUnmount(() => tabs.unregister(props.value));

const isSelected = computed(() => tabs.selected.value === props.value);

/** Roving tabindex: only the selected tab is in the tab order; arrows reach the rest. */
const tabIndex = computed(() => (isSelected.value ? 0 : -1));

const classes = computed(() => [
	'ui-tab',
	{ 'ui-tab--selected': isSelected.value, 'ui-tab--disabled': props.disabled },
]);

function onKeydown(event: KeyboardEvent) {
	// Horizontal list, so Left/Right. Home/End jump to the ends; both wrap via the parent.
	const moves = {
		ArrowRight: 'next',
		ArrowLeft: 'prev',
		Home: 'first',
		End: 'last',
	} as const;
	const direction = moves[event.key as keyof typeof moves];
	if (!direction) return;
	event.preventDefault();
	tabs?.moveFocus(props.value, direction);
}
</script>

<template>
	<button
		:id="tabs?.tabId(value)"
		type="button"
		role="tab"
		:class="classes"
		:aria-selected="isSelected"
		:aria-controls="controls ?? tabs?.panelId(value)"
		:tabindex="tabIndex"
		:disabled="disabled"
		@click="tabs?.select(value)"
		@keydown="onKeydown"
	>
		<slot />
	</button>
</template>

<style scoped>
.ui-tab {
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out);
}

.ui-tab:hover:not(.ui-tab--selected):not(.ui-tab--disabled) {
  background: var(--color-paper);
  color: var(--color-ink-soft);
}

.ui-tab--selected {
  background: var(--color-surface);
  border-color: var(--color-line);
  color: var(--color-ink);
}

.ui-tab--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ui-tab:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}
</style>
