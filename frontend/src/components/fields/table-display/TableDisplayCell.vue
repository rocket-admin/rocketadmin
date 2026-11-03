<script setup lang="ts">
/**
 * The shared shell of every table-display widget — the port of
 * `base-table-display-field.component.css` (`.field-display` / `.field-value` /
 * `.field-copy-button`), which each Angular widget re-imported.
 *
 * The value goes in the default slot (single line, ellipsised); the copy button appears on row hover
 * (and on keyboard focus) and is hidden on narrow screens. The cell sits inside a clickable table
 * row, so the button stops the click from propagating before emitting `copy` — the widget then calls
 * `useViewField().copy(…)` with whatever it wants copied.
 */
import { computed } from 'vue';
import { UiIconButton } from '@/components/ui';

const props = withDefaults(
	defineProps<{
		/** Shows the hover copy button. */
		copyable?: boolean;
		/** The copy button's accessible name and tooltip (Angular's `matTooltip`). */
		copyLabel?: string;
		/** `end` right-aligns the value and moves the copy button to the start (numbers, money, ids). */
		align?: 'start' | 'end';
	}>(),
	{ copyable: true, copyLabel: 'Copy', align: 'start' },
);

const emit = defineEmits<{
	/** The copy button was clicked (the click itself never reaches the row). */
	copy: [];
}>();

const classes = computed(() => ['table-display-cell', `table-display-cell--align-${props.align}`]);

function onCopy(event: MouseEvent) {
	event.stopPropagation();
	emit('copy');
}
</script>

<template>
	<div :class="classes">
		<span class="table-display-cell__value"><slot /></span>
		<UiIconButton
			v-if="copyable"
			class="table-display-cell__copy"
			icon="content_copy"
			size="sm"
			:label="copyLabel"
			@click="onCopy"
		/>
	</div>
</template>

<style scoped>
.table-display-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.table-display-cell__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-display-cell__copy {
  position: absolute;
  inset-inline-end: calc(-1 * var(--space-1));
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-surface);
  opacity: 0;
  transition: opacity var(--motion-fast);
}

.table-display-cell:hover .table-display-cell__copy,
.table-display-cell__copy:focus-visible {
  opacity: 1;
}

.table-display-cell--align-end {
  justify-content: flex-end;
  text-align: end;
}

.table-display-cell--align-end .table-display-cell__copy {
  inset-inline-start: 0;
  inset-inline-end: auto;
}

@media (width <= 600px) {
  .table-display-cell__copy {
    display: none;
  }

  .table-display-cell--align-end {
    justify-content: flex-start;
    text-align: start;
  }
}
</style>
