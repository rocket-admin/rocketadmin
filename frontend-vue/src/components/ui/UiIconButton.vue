<script setup lang="ts">
/**
 * Icon-only button — the `mat-icon-button` replacement (the drawer toggle, the account menu
 * trigger, row actions).
 *
 * `label` is **required** because an icon-only control has no other accessible name: it becomes the
 * `aria-label`, and also the native `title` tooltip so sighted mouse users get the same words. A
 * `UiTooltip` was not built — `title` covers every Angular `matTooltip` on an icon button, and a
 * custom tooltip is a positioning/hover-intent/dismissal problem for no new information.
 *
 * Polymorphism mirrors UiButton exactly (`to` → RouterLink, `href` → `<a>`, neither → `<button>`,
 * and a disabled link drops its `href`), so the two can sit side by side in a toolbar. Attributes and
 * listeners fall through to the rendered element, which is what lets a `UiMenu` trigger slot
 * `v-bind` its `aria-expanded`/`aria-controls`/handlers straight onto it.
 */
import { computed, useAttrs } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { RouterLink } from 'vue-router';
import UiBadge from './UiBadge.vue';
import UiIcon from './UiIcon.vue';

const props = withDefaults(
	defineProps<{
		/** Material Symbols ligature name. */
		icon: string;
		/** Accessible name and tooltip. Required — an icon alone names nothing. */
		label: string;
		/** Interaction emphasis. `ghost` is the bare icon; `secondary` adds a bordered surface. */
		variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
		/** Geometry only: the square hit area (32 / 40 / 48px). */
		size?: 'sm' | 'md' | 'lg';
		/** Renders as a RouterLink. Mutually exclusive with `href`. */
		to?: RouteLocationRaw;
		/** Renders as an `<a>`. Mutually exclusive with `to`. */
		href?: string;
		/** Anchor target, for `href`. `_blank` also sets `rel="noopener noreferrer"`. */
		target?: string;
		/** Native button type. Ignored when `to` or `href` is set. */
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** A badge over the icon: `true` for a dot, a number for a count. `false`/`0` hides it. */
		badge?: boolean | number;
		/** What the badge means, appended to the accessible name ("Account, email not verified"). */
		badgeLabel?: string;
	}>(),
	{ variant: 'ghost', size: 'md', type: 'button', disabled: false, badge: false },
);

if (import.meta.env.DEV && props.to !== undefined && props.href !== undefined) {
	console.warn('[UiIconButton] `to` and `href` are mutually exclusive; `to` wins.');
}

const attrs = useAttrs();

const tag = computed(() => {
	if (props.to !== undefined && !props.disabled) return RouterLink;
	if (props.to !== undefined || props.href !== undefined) return props.disabled ? 'span' : 'a';
	return 'button';
});

const isNativeButton = computed(() => tag.value === 'button');

const showBadge = computed(() => props.badge !== false && props.badge !== 0);

/**
 * The visible badge is aria-hidden (UiBadge), and `aria-label` overrides the button's content
 * anyway, so whatever the badge means has to be spelled into the name itself.
 */
const accessibleName = computed(() => {
	if (!showBadge.value) return props.label;
	if (props.badgeLabel) return `${props.label}, ${props.badgeLabel}`;
	return typeof props.badge === 'number' ? `${props.label}, ${props.badge}` : props.label;
});

const bindings = computed(() => {
	const shared = {
		'aria-label': accessibleName.value,
		title: props.label,
		'aria-disabled': !isNativeButton.value && props.disabled ? 'true' : undefined,
	};
	if (isNativeButton.value) return { ...shared, type: props.type, disabled: props.disabled };
	if (props.disabled) return { ...shared, role: 'link' };
	if (props.to !== undefined) return { ...shared, to: props.to };
	const rel = props.target === '_blank' ? 'noopener noreferrer' : undefined;
	return { ...shared, href: props.href, target: props.target, rel };
});

const classes = computed(() => [
	'ui-icon-button',
	`ui-icon-button--${props.variant}`,
	`ui-icon-button--size-${props.size}`,
]);

/** `lg` keeps the 24px glyph and grows only the hit area, as Material's large icon buttons do. */
const iconSize = computed(() => (props.size === 'sm' ? 'sm' : 'md'));

const badgeContent = computed(() => (typeof props.badge === 'number' ? props.badge : undefined));

function onClick(event: MouseEvent) {
	if (props.disabled && !isNativeButton.value) {
		event.preventDefault();
		event.stopPropagation();
	}
}
</script>

<template>
	<component :is="tag" v-bind="{ ...attrs, ...bindings }" :class="classes" @click="onClick">
		<UiBadge v-if="showBadge" :content="badgeContent">
			<UiIcon :name="icon" :size="iconSize" />
		</UiBadge>
		<UiIcon v-else :name="icon" :size="iconSize" />
	</component>
</template>

<style scoped>
.ui-icon-button {
  display: inline-grid;
  place-items: center;
  flex: none;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-ink-soft);
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--motion-fast),
    border-color var(--motion-fast),
    color var(--motion-fast);
}

.ui-icon-button:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

.ui-icon-button--size-sm {
  width: var(--space-8);
  height: var(--space-8);
}

.ui-icon-button--size-md {
  width: var(--space-10);
  height: var(--space-10);
}

.ui-icon-button--size-lg {
  width: var(--space-12);
  height: var(--space-12);
}

.ui-icon-button--ghost:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--color-paper-2);
  color: var(--color-ink);
}

.ui-icon-button--secondary {
  background: var(--color-surface);
  border-color: var(--color-line);
}

.ui-icon-button--secondary:hover:not(:disabled, [aria-disabled='true']) {
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.ui-icon-button--primary {
  background: var(--color-accent);
  color: var(--color-surface);
}

.ui-icon-button--primary:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--color-accent-ink);
}

.ui-icon-button--danger {
  color: var(--color-danger);
}

.ui-icon-button--danger:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--color-danger-bg);
}

.ui-icon-button--danger:focus-visible {
  box-shadow: var(--ring-danger);
}

.ui-icon-button:disabled,
.ui-icon-button[aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
}

/* A badge's surface ring should match the button it sits on, not the page. */
.ui-icon-button--primary :deep(.ui-badge__indicator) {
  box-shadow: 0 0 0 2px var(--color-accent);
}
</style>
