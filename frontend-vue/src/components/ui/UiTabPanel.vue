<script setup lang="ts">
/**
 * The panel a `UiTab` controls. Rendered only while its tab is selected.
 *
 * `tabindex="0"` is deliberate and required by the APG: when a panel holds no focusable content,
 * it must itself be focusable so a keyboard user can reach the content the tab just revealed.
 */
import { computed, inject } from 'vue';
import { TABS_CONTEXT } from './tabsContext';

const props = defineProps<{
	/** Matches the `value` of the `UiTab` that controls this panel. */
	value: string;
}>();

const tabs = inject(TABS_CONTEXT);
if (!tabs) throw new Error('[UiTabPanel] must be used inside a UiTabs default slot.');

const isSelected = computed(() => tabs.selected.value === props.value);
</script>

<template>
	<div
		v-if="isSelected"
		:id="tabs?.panelId(value)"
		class="ui-tab-panel"
		role="tabpanel"
		:aria-labelledby="tabs?.tabId(value)"
		tabindex="0"
	>
		<slot />
	</div>
</template>

<style scoped>
.ui-tab-panel:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
  border-radius: var(--radius-control);
}
</style>
