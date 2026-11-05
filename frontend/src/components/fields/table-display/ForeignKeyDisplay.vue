<script setup lang="ts">
/**
 * Port of table-display-fields/foreign-key (`ForeignKeyDisplayComponent`): the key as a chip that
 * opens the referenced row (`foreignKeyClick`, the Angular `onForeignKeyClick`).
 */
import type { TableForeignKey } from '@/models/table';
import type { TableDisplayFieldProps, ViewFieldEmits } from '../types';
import { useViewField } from '../useFieldWidget';
import TableDisplayCell from './TableDisplayCell.vue';

const props = withDefaults(
	defineProps<
		TableDisplayFieldProps & {
			value?: string | number | null;
			/** The referenced row is the one open in the side panel. */
			isSelected?: boolean;
			relations?: TableForeignKey;
		}
	>(),
	{ isSelected: false },
);
const emit = defineEmits<
	ViewFieldEmits & {
		foreignKeyClick: [payload: { foreignKey: TableForeignKey; value: string | number }];
	}
>();

const { copy } = useViewField(props, emit);

function onForeignKeyClick(event: MouseEvent) {
	event.stopPropagation();
	if (props.relations && props.value != null) {
		emit('foreignKeyClick', { foreignKey: props.relations, value: props.value });
	}
}
</script>

<template>
	<TableDisplayCell @copy="copy(value)">
		<span v-if="value == null">—</span>
		<button
			v-else-if="relations"
			type="button"
			class="foreign-key-display__button"
			:class="{ 'foreign-key-display__button--selected': isSelected }"
			@click="onForeignKeyClick"
		>
			{{ value }}
		</button>
		<span v-else>{{ value }}</span>
	</TableDisplayCell>
</template>

<style scoped>
.foreign-key-display__button {
  max-width: 100%;
  padding: var(--space-05) var(--space-2);
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  text-align: start;
  text-overflow: ellipsis;
  cursor: pointer;
  transition:
    background var(--motion-fast),
    border-color var(--motion-fast);
}

.foreign-key-display__button:hover,
.foreign-key-display__button--selected {
  background: var(--color-paper-2);
  border-color: var(--color-line-strong);
}

.foreign-key-display__button:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}
</style>
