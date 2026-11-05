<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-renderers/table-panel: a saved query's rows
// as a table, one column per key of the first row.
import { computed } from 'vue';
import { type TableColumn, UiTable } from '@/components/ui';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';

const props = withDefaults(
	defineProps<{
		widget: DashboardWidget;
		connectionId: string;
		preloadedQuery?: SavedQuery | null;
		preloadedData?: Record<string, unknown>[];
	}>(),
	{ preloadedQuery: null, preloadedData: () => [] },
);

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => {
	const first = props.preloadedData[0];
	return first ? Object.keys(first).map((key) => ({ key, label: key })) : [];
});
</script>

<template>
	<div class="table-panel">
		<UiTable
			v-if="preloadedData.length > 0"
			class="table-panel__table"
			:columns="columns"
			:rows="preloadedData"
			:label="preloadedQuery?.name || 'Query results'"
			size="sm"
			sticky-header
		/>
		<div v-else class="table-panel__empty">
			<p>No data available</p>
		</div>
	</div>
</template>

<style scoped>
.table-panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.table-panel__table {
	flex: 1;
	min-height: 0;
}

.table-panel__table :deep(td) {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.table-panel__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	text-align: center;
	color: var(--color-muted);
}

.table-panel__empty p {
	margin: 0;
}
</style>
