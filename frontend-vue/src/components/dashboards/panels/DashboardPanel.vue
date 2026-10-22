<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-renderers/dashboard-panel: loads a widget's
// saved query and its result, then renders the chart, table, counter or text panel for it.
// Emits `loaded` with the saved query so the dashboard can title the panel (Angular's parent read
// the public `savedQuery` signal through a template ref).
import { ref, watch } from 'vue';
import { isApiError } from '@/api/client';
import { UiSpinner } from '@/components/ui';
import type { DashboardWidget } from '@/models/dashboard';
import type { SavedQuery } from '@/models/saved-query';
import { useSavedQueriesStore } from '@/stores/saved-queries';
import ChartPanel from './ChartPanel.vue';
import CounterPanel from './CounterPanel.vue';
import TablePanel from './TablePanel.vue';
import TextPanel from './TextPanel.vue';

const props = defineProps<{ widget: DashboardWidget; connectionId: string }>();
const emit = defineEmits<{ loaded: [query: SavedQuery | null] }>();

const savedQueries = useSavedQueriesStore();

const loading = ref(true);
const error = ref<string | null>(null);
const queryData = ref<Record<string, unknown>[]>([]);
const savedQuery = ref<SavedQuery | null>(null);

watch(
	() => [props.widget.query_id, props.connectionId] as const,
	([queryId]) => {
		if (queryId) {
			loadData(queryId);
		} else {
			loading.value = false;
			error.value = 'No query linked to this panel';
		}
	},
	{ immediate: true },
);

async function loadData(queryId: string): Promise<void> {
	loading.value = true;
	error.value = null;
	try {
		const [query, result] = await Promise.all([
			savedQueries.fetchSavedQuery(props.connectionId, queryId),
			savedQueries.executeSavedQuery(props.connectionId, queryId),
		]);
		savedQuery.value = query;
		if (result) queryData.value = result.data;
		emit('loaded', query);
	} catch (err: unknown) {
		error.value = (isApiError(err) && err.body.message) || 'Failed to load data';
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="dashboard-panel">
		<div v-if="loading" class="dashboard-panel__state">
			<UiSpinner label="Loading panel" />
		</div>
		<div v-else-if="error" class="dashboard-panel__state dashboard-panel__state--error">
			<span>{{ error }}</span>
		</div>
		<template v-else-if="savedQuery">
			<ChartPanel
				v-if="savedQuery.widget_type === 'chart'"
				:widget="widget"
				:connection-id="connectionId"
				:preloaded-query="savedQuery"
				:preloaded-data="queryData"
			/>
			<TablePanel
				v-else-if="savedQuery.widget_type === 'table'"
				:widget="widget"
				:connection-id="connectionId"
				:preloaded-query="savedQuery"
				:preloaded-data="queryData"
			/>
			<CounterPanel
				v-else-if="savedQuery.widget_type === 'counter'"
				:widget="widget"
				:connection-id="connectionId"
				:preloaded-query="savedQuery"
				:preloaded-data="queryData"
			/>
			<TextPanel v-else-if="savedQuery.widget_type === 'text'" :widget="widget" :preloaded-query="savedQuery" />
			<div v-else class="dashboard-panel__state dashboard-panel__state--error">
				<span>Unknown panel type: {{ savedQuery.widget_type }}</span>
			</div>
		</template>
	</div>
</template>

<style scoped>
.dashboard-panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.dashboard-panel__state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.dashboard-panel__state--error {
	padding: var(--space-4);
	font-size: var(--text-sm);
	text-align: center;
	color: var(--color-danger);
}
</style>
