<script setup lang="ts">
/**
 * Tab list with roving `tabindex` and full keyboard navigation.
 *
 * One call site would not normally justify an abstraction — but that call site is *currently broken
 * ARIA*: `WebsiteDetailView`'s composer-mode switcher is a `role="tablist"` wrapping plain buttons
 * with no `role="tab"`, no `aria-selected` and no `aria-controls`, so a screenreader announces a tab
 * list containing zero tabs. Fixing it inline means writing this keyboard handling anyway; in a
 * primitive it is the same code and it is testable.
 *
 * Roving `tabindex` (exactly one tab in the tab order, arrows move between them) is the APG pattern.
 * The alternative — every tab tabbable — makes a 5-tab bar cost 5 Tab presses to step past.
 */
import { computed, provide, type Ref, useId } from 'vue';
import { TABS_CONTEXT } from './tabsContext';

const props = defineProps<{
	/** The selected tab's `value`. Two-way via `v-model`. */
	modelValue: string;
	/** Accessible name for the tab list, e.g. "Composer mode". */
	label: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [string] }>();

const uid = useId();
const tabId = (value: string) => `${uid}-tab-${value}`;
const panelId = (value: string) => `${uid}-panel-${value}`;

/**
 * Registration order is DOM order, which is what Arrow keys must follow. A plain array holding the
 * children's `disabled` refs rather than a DOM query: it stays correct under `v-if`/`v-for`, and it
 * is deliberately non-reactive — nothing renders from it, `moveFocus` just reads it on keypress.
 */
const tabs: Array<{ value: string; disabled: Ref<boolean> }> = [];

function register(value: string, disabled: Ref<boolean>) {
	if (!tabs.some((tab) => tab.value === value)) tabs.push({ value, disabled });
}

function unregister(value: string) {
	const index = tabs.findIndex((tab) => tab.value === value);
	if (index !== -1) tabs.splice(index, 1);
}

function select(value: string) {
	if (value !== props.modelValue) emit('update:modelValue', value);
}

/**
 * Selection follows focus, per the APG's default for tab lists whose panels are cheap to render.
 * Focus is moved imperatively because the roving `tabindex` only updates after the re-render.
 */
function moveFocus(from: string, direction: 'next' | 'prev' | 'first' | 'last') {
	const enabled = tabs.filter((tab) => !tab.disabled.value);
	const first = enabled[0];
	const last = enabled[enabled.length - 1];
	if (!first || !last) return;

	let target: string;
	if (direction === 'first') {
		target = first.value;
	} else if (direction === 'last') {
		target = last.value;
	} else {
		// -1 only if `from` is not in `enabled` — unreachable via the keyboard, since a disabled tab
		// is natively `disabled` and so fires no keydown. Handled anyway: -1 + step still resolves to
		// a valid index through the modulo, and the `?? first` below backstops it.
		const currentIndex = enabled.findIndex((tab) => tab.value === from);
		const step = direction === 'next' ? 1 : -1;
		// Wraps at both ends — (i + step + n) % n keeps the index positive for `prev` at 0.
		const nextIndex = (currentIndex + step + enabled.length) % enabled.length;
		target = (enabled[nextIndex] ?? first).value;
	}

	select(target);
	document.getElementById(tabId(target))?.focus();
}

provide(TABS_CONTEXT, {
	selected: computed(() => props.modelValue),
	select,
	register,
	unregister,
	moveFocus,
	tabId,
	panelId,
});
</script>

<template>
	<div class="ui-tabs">
		<div class="ui-tabs__list" role="tablist" :aria-label="label">
			<slot name="tabs" />
		</div>
		<slot />
	</div>
</template>

<style scoped>
.ui-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ui-tabs__list {
  display: flex;
  gap: var(--space-1);
}
</style>
