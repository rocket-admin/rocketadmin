<script setup lang="ts">
// Port of frontend/src/app/components/skeletons/placeholder-table-data.
//
// A 7-column × 6-row table grid on wide screens, swapped for six 4-line cards at ≤600px — the same
// 42 cells and 6 cards, in the same column proportions, as the Angular component.
//
// The root is the one `role="status"` region; every bar inside is a `decorative` UiSkeleton. When
// nested inside another placeholder (PlaceholderTableView, PlaceholderCompany) pass `nested`: the
// outer placeholder already owns the announcement, and two status regions would announce twice.
import { computed } from 'vue';
import { UiSkeleton } from '@/components/ui';

const props = withDefaults(
	defineProps<{
		/** Announced while loading. */
		label?: string;
		/** Inside another placeholder that already owns the status region. */
		nested?: boolean;
	}>(),
	{ label: 'Loading table', nested: false },
);

const COLUMNS = 7;
const ROWS = 6;
const CARDS = 6;
/** Mobile card line widths: short, full, medium, long. */
const CARD_LINES = ['30%', '100%', '60%', '80%'];

const a11y = computed(() => (props.nested ? {} : { role: 'status', 'aria-label': props.label }));
</script>

<template>
	<div class="ph" v-bind="a11y">
		<div class="ph__table">
			<div v-for="cell in COLUMNS * ROWS" :key="cell" class="ph__cell">
				<UiSkeleton decorative shape="control" height="1.5rem" />
			</div>
		</div>
		<div class="ph__cards">
			<div v-for="card in CARDS" :key="card" class="ph__card">
				<UiSkeleton v-for="width in CARD_LINES" :key="width" decorative shape="control" :width="width" height="0.875rem" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.ph__table {
	display: grid;
	grid-template-columns: 3.5rem 20% 30% 7% 8% 15% calc(20% - 3.5rem);
	overflow: auto;
	width: 100%;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.ph__cell {
	padding: var(--space-2) var(--space-4);
	border-bottom: 1px solid var(--color-line);
}

.ph__cell:nth-last-child(-n + 7) {
	border-bottom: none;
}

.ph__cards {
	display: none;
}

@media (width <= 600px) {
	.ph__table {
		display: none;
	}

	.ph__cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: 0 0 var(--space-4);
	}

	.ph__card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-line);
		border-radius: var(--radius-panel);
		background: var(--color-surface);
	}
}
</style>
