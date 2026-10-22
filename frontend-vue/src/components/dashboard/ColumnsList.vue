<script setup lang="ts">
// The table view's column picker, in the desktop "Columns" popover and the mobile columns sheet:
// visible columns first, each with a checkbox, reorderable by drag (vuedraggable in place of
// cdkDropList). The last visible column can't be hidden.
import { computed } from 'vue';
import Draggable from 'vuedraggable';
import { UiCheckbox, UiIcon } from '@/components/ui';
import type { TableColumnState } from '@/composables/useTableData';
import { sortedColumns } from '@/lib/table-view';

const props = defineProps<{
	columns: TableColumnState[];
	/** How many columns are visible now. */
	displayedCount: number;
}>();

const emit = defineEmits<{
	/** A checkbox changed (the column's `selected` is already updated). */
	visibilityChange: [];
	/** Dragged from `previousIndex` to `currentIndex`, both positions in the visible-first order. */
	reorder: [previousIndex: number, currentIndex: number];
}>();

const sorted = computed(() => sortedColumns(props.columns));

function setSelected(column: TableColumnState, selected: boolean) {
	column.selected = selected;
	emit('visibilityChange');
}

function onChange(event: { moved?: { oldIndex: number; newIndex: number } }) {
	if (event.moved) emit('reorder', event.moved.oldIndex, event.moved.newIndex);
}
</script>

<template>
	<Draggable
		:model-value="sorted"
		item-key="title"
		tag="ul"
		class="columns-list"
		handle=".columns-list__handle"
		:force-fallback="true"
		@change="onChange"
	>
		<template #item="{ element: column }">
			<li class="columns-list__item">
				<UiIcon name="drag_indicator" size="sm" class="columns-list__handle" />
				<UiCheckbox
					:model-value="column.selected"
					:disabled="displayedCount === 1 && column.selected"
					@update:model-value="(checked: boolean) => setSelected(column, checked)"
				>
					{{ column.normalizedTitle }}
				</UiCheckbox>
			</li>
		</template>
	</Draggable>
</template>

<style scoped>
.columns-list {
	margin: 0;
	padding: var(--space-1) 0;
	list-style: none;
}

.columns-list__item {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-1) var(--space-3);
}

.columns-list__item:hover {
	background: var(--color-paper-2);
}

.columns-list__handle {
	flex-shrink: 0;
	color: var(--color-muted);
	cursor: grab;
}
</style>
