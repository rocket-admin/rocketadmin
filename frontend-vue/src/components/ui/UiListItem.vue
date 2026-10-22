<script setup lang="ts">
/**
 * One row of a `UiList` — the `mat-list-item` replacement. Always an `<li>`; its content is:
 *
 * - a `RouterLink` with `to` (the exact-active one gets `aria-current="page"` from the router, and
 *   the `--active` modifier),
 * - an `<a>` with `href`,
 * - a `<button>` with `interactive`, emitting `click` (e.g. "view this related record"),
 * - otherwise static content.
 *
 * Slots: `leading` (an icon), default (the title), `description` (a secondary line —
 * `matListItemLine`), `trailing` (a count, a check). When the item is a link or button, `leading`
 * and `trailing` are inside it and so must not hold controls of their own.
 */
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { RouterLink } from 'vue-router';

const props = withDefaults(
	defineProps<{
		/** Renders the item as a RouterLink. */
		to?: RouteLocationRaw;
		/** Renders the item as an `<a>`. Ignored when `to` is set. */
		href?: string;
		/** Anchor target, for `href`. `_blank` also sets `rel="noopener noreferrer"`. */
		target?: string;
		/** Renders the item as a `<button>` emitting `click`. Ignored with `to`/`href`. */
		interactive?: boolean;
		/** Marks the item as the current one when the router cannot tell (`href`, `interactive`, static). */
		active?: boolean;
		/** Disables a button item; a disabled link loses its `href`. */
		disabled?: boolean;
	}>(),
	{ interactive: false, active: false, disabled: false },
);

const emit = defineEmits<{ click: [MouseEvent] }>();

const tag = computed(() => {
	if (props.to !== undefined) return props.disabled ? 'span' : RouterLink;
	if (props.href !== undefined) return props.disabled ? 'span' : 'a';
	if (props.interactive) return 'button';
	return 'div';
});

const bindings = computed(() => {
	if (props.to !== undefined && !props.disabled)
		return { to: props.to, exactActiveClass: 'ui-list-item__content--active' };
	if (props.href !== undefined && !props.disabled) {
		const rel = props.target === '_blank' ? 'noopener noreferrer' : undefined;
		return { href: props.href, target: props.target, rel, 'aria-current': props.active ? 'page' : undefined };
	}
	if (props.interactive)
		return { type: 'button', disabled: props.disabled, 'aria-current': props.active ? 'true' : undefined };
	return {};
});

const contentClasses = computed(() => [
	'ui-list-item__content',
	{
		'ui-list-item__content--interactive': tag.value !== 'div' && !props.disabled,
		'ui-list-item__content--active': props.active,
		'ui-list-item__content--disabled': props.disabled,
	},
]);

function onClick(event: MouseEvent) {
	if (props.interactive && !props.disabled) emit('click', event);
}
</script>

<template>
	<li class="ui-list-item">
		<component :is="tag" v-bind="bindings" :class="contentClasses" @click="onClick">
			<span v-if="$slots.leading" class="ui-list-item__leading"><slot name="leading" /></span>
			<span class="ui-list-item__body">
				<span class="ui-list-item__title"><slot /></span>
				<span v-if="$slots.description" class="ui-list-item__description"><slot name="description" /></span>
			</span>
			<span v-if="$slots.trailing" class="ui-list-item__trailing"><slot name="trailing" /></span>
		</component>
	</li>
</template>

<style scoped>
.ui-list-item__content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  font-size: var(--text-sm);
  text-align: start;
  text-decoration: none;
  color: var(--color-ink);
}

.ui-list--size-md .ui-list-item__content {
  padding: var(--space-3) var(--space-4);
}

.ui-list-item__content--interactive {
  cursor: pointer;
  transition: background var(--motion-fast);
}

.ui-list-item__content--interactive:hover {
  background: var(--color-paper);
}

.ui-list-item__content--interactive:focus-visible {
  outline: none;
  box-shadow: inset var(--ring-focus);
}

.ui-list-item__content--active,
.ui-list-item__content--active:hover {
  background: var(--color-paper-2);
  font-weight: var(--weight-medium);
}

.ui-list-item__content--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ui-list-item__leading,
.ui-list-item__trailing {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--color-muted);
}

.ui-list-item__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-05);
  min-width: 0;
}

.ui-list-item__description {
  font-size: var(--text-xs);
  color: var(--color-muted);
}
</style>
