<script setup lang="ts">
/**
 * Page navigation for a paged list — the `mat-paginator` replacement, used under a `UiTable`.
 *
 * Behaviour and texts follow Material so ported pages read the same: "Items per page:" with a
 * page-size picker, the "1 – 30 of 120" range label, and previous/next (plus first/last with
 * `showFirstLast`) buttons. Changing the page size keeps the first visible item on screen by
 * recomputing the page index, exactly as `MatPaginator._changePageSize` does.
 *
 * Purely controlled by numbers: it emits `update:pageIndex` / `update:pageSize` and a Material-shaped
 * `page` event, and the caller fetches. The range label is a polite live region, so a screenreader
 * user pressing "Next page" hears where they landed while focus stays on the button.
 */
import { computed, useId } from 'vue';
import type { SelectOption } from './selectOption';
import type { PageEvent } from './tableTypes';
import UiIconButton from './UiIconButton.vue';
import UiSelect from './UiSelect.vue';

const props = withDefaults(
	defineProps<{
		/** Total number of items across all pages. */
		length: number;
		/** Page sizes offered in the picker. Empty hides the picker. The current `pageSize` is always included. */
		pageSizeOptions?: number[];
		/** Adds first/last page buttons. */
		showFirstLast?: boolean;
		/** Accessible name of the paginator group. */
		label?: string;
		/** Text before the page-size picker. */
		itemsPerPageLabel?: string;
		disabled?: boolean;
	}>(),
	{
		pageSizeOptions: () => [],
		showFirstLast: false,
		label: 'Pagination',
		itemsPerPageLabel: 'Items per page:',
		disabled: false,
	},
);

/** Zero-based page index. Two-way via `v-model:page-index`. */
const pageIndex = defineModel<number>('pageIndex', { default: 0 });
/** Items per page. Two-way via `v-model:page-size`. */
const pageSize = defineModel<number>('pageSize', { default: 30 });

const emit = defineEmits<{ page: [PageEvent] }>();

const sizeLabelId = `${useId()}-page-size`;

const sizeOptions = computed<SelectOption<number>[]>(() => {
	if (props.pageSizeOptions.length === 0) return [];
	const sizes = props.pageSizeOptions.includes(pageSize.value)
		? props.pageSizeOptions
		: [...props.pageSizeOptions, pageSize.value].sort((a, b) => a - b);
	return sizes.map((size) => ({ value: size, label: String(size) }));
});

const pageCount = computed(() => (pageSize.value > 0 ? Math.ceil(props.length / pageSize.value) : 0));
const hasPrevious = computed(() => pageIndex.value >= 1 && pageSize.value > 0);
const hasNext = computed(() => pageIndex.value < pageCount.value - 1 && pageSize.value > 0);

/** Material's `MatPaginatorIntl.getRangeLabel`, verbatim in behaviour. */
const rangeLabel = computed(() => {
	if (props.length === 0 || pageSize.value === 0) return `0 of ${props.length}`;
	const length = Math.max(props.length, 0);
	const start = pageIndex.value * pageSize.value;
	const end = start < length ? Math.min(start + pageSize.value, length) : start + pageSize.value;
	return `${start + 1} – ${end} of ${length}`;
});

function goTo(index: number) {
	const previousPageIndex = pageIndex.value;
	if (index === previousPageIndex) return;
	pageIndex.value = index;
	emit('page', { pageIndex: index, pageSize: pageSize.value, previousPageIndex, length: props.length });
}

function changePageSize(size: number | number[] | null) {
	if (typeof size !== 'number' || size === pageSize.value) return;
	const previousPageIndex = pageIndex.value;
	// Keep the first item of the current page visible.
	const index = Math.floor((pageIndex.value * pageSize.value) / size) || 0;
	pageSize.value = size;
	pageIndex.value = index;
	emit('page', { pageIndex: index, pageSize: size, previousPageIndex, length: props.length });
}
</script>

<template>
	<div class="ui-paginator" role="group" :aria-label="label">
		<div v-if="sizeOptions.length" class="ui-paginator__size">
			<span :id="sizeLabelId" class="ui-paginator__size-label">{{ itemsPerPageLabel }}</span>
			<UiSelect
				class="ui-paginator__size-select"
				size="sm"
				:options="sizeOptions"
				:model-value="pageSize"
				:disabled="disabled"
				:aria-labelledby="sizeLabelId"
				@update:model-value="changePageSize"
			/>
		</div>
		<div class="ui-paginator__range" aria-live="polite">{{ rangeLabel }}</div>
		<div class="ui-paginator__nav">
			<UiIconButton
				v-if="showFirstLast"
				icon="first_page"
				label="First page"
				size="sm"
				:disabled="disabled || !hasPrevious"
				@click="goTo(0)"
			/>
			<UiIconButton
				icon="chevron_left"
				label="Previous page"
				size="sm"
				:disabled="disabled || !hasPrevious"
				@click="goTo(pageIndex - 1)"
			/>
			<UiIconButton
				icon="chevron_right"
				label="Next page"
				size="sm"
				:disabled="disabled || !hasNext"
				@click="goTo(pageIndex + 1)"
			/>
			<UiIconButton
				v-if="showFirstLast"
				icon="last_page"
				label="Last page"
				size="sm"
				:disabled="disabled || !hasNext"
				@click="goTo(pageCount - 1)"
			/>
		</div>
	</div>
</template>

<style scoped>
.ui-paginator {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2) var(--space-6);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.ui-paginator__size {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ui-paginator__size .ui-paginator__size-select {
  width: auto;
  min-width: 4.5rem;
}

.ui-paginator__range {
  white-space: nowrap;
}

.ui-paginator__nav {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
</style>
