<script setup lang="ts">
/**
 * One entry in a `UiMenu` — the `mat-menu-item` replacement.
 *
 * Three shapes, by the same typed-props polymorphism as UiButton: `to` renders a RouterLink, `href`
 * an `<a>` (with `target`), neither a `<button>` that emits `select`. All carry `role="menuitem"` and
 * `tabindex="-1"` — the menu moves focus between items with the arrow keys, so none of them sit in
 * the page's tab order. Choosing any of them closes the menu and returns focus to the trigger.
 *
 * Disabled items stay in the DOM with `aria-disabled` (a disabled link also drops its `href`), and
 * the menu's arrow keys skip them.
 */
import { computed, inject } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { RouterLink } from 'vue-router';
import { MENU_CONTEXT } from './menuContext';
import UiIcon from './UiIcon.vue';

const props = withDefaults(
	defineProps<{
		/** Renders as a RouterLink. Mutually exclusive with `href`. */
		to?: RouteLocationRaw;
		/** Renders as an `<a>`. Mutually exclusive with `to`. */
		href?: string;
		/** Anchor target, for `href`. `_blank` also sets `rel="noopener noreferrer"`. */
		target?: string;
		/** Leading Material Symbols icon. Use the `leading` slot instead for anything richer (a badge). */
		icon?: string;
		/** A muted second line under the label, e.g. the signed-in email under "Account". */
		description?: string;
		/** Interaction emphasis. `danger` for destructive entries such as "Delete". */
		variant?: 'ghost' | 'danger';
		disabled?: boolean;
	}>(),
	{ variant: 'ghost', disabled: false },
);

const emit = defineEmits<{ select: [MouseEvent] }>();

const menu = inject(MENU_CONTEXT, undefined);
if (import.meta.env.DEV && !menu) console.warn('[UiMenuItem] must be used inside a UiMenu.');

const tag = computed(() => {
	if (props.to !== undefined && !props.disabled) return RouterLink;
	if (props.to !== undefined || props.href !== undefined) return props.disabled ? 'span' : 'a';
	return 'button';
});

const bindings = computed(() => {
	const shared = { role: 'menuitem', tabindex: -1, 'aria-disabled': props.disabled ? 'true' : undefined };
	if (tag.value === 'button') return { ...shared, type: 'button' };
	if (tag.value === 'span') return shared;
	if (props.to !== undefined) return { ...shared, to: props.to };
	const rel = props.target === '_blank' ? 'noopener noreferrer' : undefined;
	return { ...shared, href: props.href, target: props.target, rel };
});

const classes = computed(() => [
	'ui-menu-item',
	`ui-menu-item--${props.variant}`,
	{ 'ui-menu-item--disabled': props.disabled },
]);

function onClick(event: MouseEvent) {
	if (props.disabled) {
		event.preventDefault();
		event.stopPropagation();
		return;
	}
	emit('select', event);
	menu?.close({ returnFocus: true });
}

/** APG: Space activates a menu item too. Buttons do that natively; links and spans don't. */
function onKeydown(event: KeyboardEvent) {
	if (event.key === ' ' && tag.value !== 'button') {
		event.preventDefault();
		(event.currentTarget as HTMLElement).click();
	}
}
</script>

<template>
	<component :is="tag" v-bind="bindings" :class="classes" @click="onClick" @keydown="onKeydown">
		<span v-if="$slots.leading || icon" class="ui-menu-item__adornment">
			<slot name="leading"><UiIcon v-if="icon" :name="icon" size="sm" /></slot>
		</span>
		<span class="ui-menu-item__text">
			<span class="ui-menu-item__label"><slot /></span>
			<span v-if="description" class="ui-menu-item__description">{{ description }}</span>
		</span>
		<span v-if="$slots.trailing" class="ui-menu-item__adornment">
			<slot name="trailing" />
		</span>
	</component>
</template>

<style scoped>
.ui-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--space-10);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: calc(var(--radius-control) - var(--space-1));
  background: transparent;
  color: var(--color-ink);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}

/* Keyboard focus and hover are the same highlight: in a menu, the focused item *is* the current one. */
.ui-menu-item:hover:not(.ui-menu-item--disabled),
.ui-menu-item:focus-visible {
  outline: none;
  background: var(--color-paper-2);
}

.ui-menu-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--color-accent);
}

/* RouterLink marks the current route; the account menu's "Account" item reads as where you are. */
.ui-menu-item[aria-current='page'] {
  color: var(--color-accent-ink);
  font-weight: var(--weight-semibold);
}

.ui-menu-item--danger {
  color: var(--color-danger);
}

.ui-menu-item--danger:hover:not(.ui-menu-item--disabled),
.ui-menu-item--danger:focus-visible {
  background: var(--color-danger-bg);
}

.ui-menu-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-menu-item__adornment {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--color-muted);
}

.ui-menu-item--danger .ui-menu-item__adornment {
  color: inherit;
}

.ui-menu-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.ui-menu-item__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-menu-item__description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-2xs);
  color: var(--color-muted);
}
</style>
