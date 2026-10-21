<script setup lang="ts">
/**
 * A small count or dot pinned to the top-end corner of whatever it wraps — the `matBadge`
 * replacement. RocketAdmin's one real use is the "1" on the account button and menu item while the
 * user's email is unverified, toggled with `hidden`.
 *
 * Wrap the badged element in the default slot; with no slot the indicator renders inline, for a
 * count next to a label.
 *
 * The indicator itself is `aria-hidden`: "1" floating after a button name means nothing to a
 * screenreader. Say what it means with `label` (rendered as visually hidden text), or — inside a
 * `UiIconButton`, whose `aria-label` overrides its content — with the button's `badgeLabel`.
 */
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** The count or short text. Omitted, the badge is a plain dot. */
		content?: number | string;
		/** Counts above this render as `max+`. */
		max?: number;
		/** Hides the indicator without unmounting the wrapped content. */
		hidden?: boolean;
		/** Status colour. Non-interactive, so this is `tone`, not `variant`. */
		tone?: 'accent' | 'danger' | 'neutral';
		/** What the badge means to a screenreader, e.g. "Email not verified". Visually hidden. */
		label?: string;
	}>(),
	{ max: 99, hidden: false, tone: 'accent' },
);

const text = computed(() => {
	if (props.content === undefined) return '';
	if (typeof props.content === 'number' && props.content > props.max) return `${props.max}+`;
	return String(props.content);
});

const isDot = computed(() => text.value === '');

const indicatorClasses = computed(() => [
	'ui-badge__indicator',
	`ui-badge__indicator--${props.tone}`,
	{ 'ui-badge__indicator--dot': isDot.value },
]);
</script>

<template>
	<span :class="['ui-badge', { 'ui-badge--overlay': !!$slots.default }]">
		<slot />
		<template v-if="!hidden">
			<span :class="indicatorClasses" aria-hidden="true">{{ text }}</span>
			<span v-if="label" class="ui-badge__label">{{ label }}</span>
		</template>
	</span>
</template>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.ui-badge--overlay {
  position: relative;
}

.ui-badge__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: var(--space-4);
  height: var(--space-4);
  padding: 0 var(--space-1);
  border-radius: var(--radius-pill);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

/* Over the wrapped element: pinned to the top-end corner, overhanging it by half its size, with a
   surface-coloured ring so it separates from an icon of the same colour. */
.ui-badge--overlay > .ui-badge__indicator {
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  translate: 40% -40%;
  box-shadow: 0 0 0 2px var(--color-surface);
}

.ui-badge--overlay > .ui-badge__indicator:dir(rtl) {
  translate: -40% -40%;
}

.ui-badge__indicator--dot {
  min-width: var(--space-2);
  width: var(--space-2);
  height: var(--space-2);
  padding: 0;
}

.ui-badge__indicator--accent {
  background: var(--color-accent);
  color: var(--color-surface);
}

.ui-badge__indicator--danger {
  background: var(--color-danger-strong);
  color: var(--color-surface);
}

.ui-badge__indicator--neutral {
  background: var(--color-paper-2);
  color: var(--color-ink-soft);
}

/* Visually hidden, still read. */
.ui-badge__label {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
