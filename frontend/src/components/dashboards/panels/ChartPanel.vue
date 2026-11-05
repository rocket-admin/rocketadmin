<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-renderers/chart-panel: a saved query's rows
// drawn as its chart. Without stored label/value columns it falls back to the first two columns.
import '@/components/charts/chartjs';
import { computed } from 'vue';
import { Chart } from 'vue-chartjs';
import {
	buildChartData,
	buildChartOptions,
	buildDataLabelsPlugin,
	getMappedChartType,
} from '@/lib/chart-config.helper';
import type { DashboardWidget } from '@/models/dashboard';
import type { ChartWidgetOptions, SavedQuery } from '@/models/saved-query';

const props = withDefaults(
	defineProps<{
		widget: DashboardWidget;
		connectionId: string;
		preloadedQuery?: SavedQuery | null;
		preloadedData?: Record<string, unknown>[];
	}>(),
	{ preloadedQuery: null, preloadedData: () => [] },
);

const storedOptions = computed(() => (props.preloadedQuery?.widget_options ?? {}) as Partial<ChartWidgetOptions>);
const chartType = computed(() => props.preloadedQuery?.chart_type || 'bar');

const resolvedOptions = computed<ChartWidgetOptions>(() => {
	const raw = storedOptions.value;
	const keys = props.preloadedData[0] ? Object.keys(props.preloadedData[0]) : [];
	return {
		...raw,
		label_column: raw.label_column || keys[0] || '',
		value_column: raw.value_column || keys[1] || keys[0] || '',
	};
});

const chartData = computed(() => {
	if (!props.preloadedData.length || !props.preloadedQuery) return null;
	return buildChartData(props.preloadedData, chartType.value, resolvedOptions.value);
});

const chartOptions = computed(() => buildChartOptions(chartType.value, resolvedOptions.value));
const chartPlugins = computed(() =>
	props.preloadedQuery ? [buildDataLabelsPlugin(storedOptions.value as ChartWidgetOptions)] : [],
);
const mappedChartType = computed(() => getMappedChartType(chartType.value, storedOptions.value as ChartWidgetOptions));
</script>

<template>
	<div class="chart-panel">
		<div v-if="chartData" class="chart-panel__chart">
			<Chart :type="mappedChartType" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
		</div>
		<div v-else class="chart-panel__empty">
			<p>No data available</p>
		</div>
	</div>
</template>

<style scoped>
.chart-panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.chart-panel__chart {
	position: relative;
	flex: 1;
	min-height: 0;
}

.chart-panel__chart :deep(canvas) {
	width: 100% !important;
	height: 100% !important;
}

.chart-panel__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	text-align: center;
	color: var(--color-muted);
}

.chart-panel__empty p {
	margin: 0;
}
</style>
