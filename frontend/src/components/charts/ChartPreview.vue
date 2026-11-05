<script setup lang="ts">
// Port of frontend/src/app/components/charts/chart-preview: the live chart on the panel editor.
// Draws `data` with the saved-query chart options (src/lib/chart-config.helper.ts); without
// `widgetOptions` it falls back to the legacy single label/value column inputs.
import './chartjs';
import { computed } from 'vue';
import { Chart } from 'vue-chartjs';
import {
	buildChartData,
	buildChartOptions,
	buildDataLabelsPlugin,
	getMappedChartType,
} from '@/lib/chart-config.helper';
import type { ChartType, ChartWidgetOptions } from '@/models/saved-query';

const props = withDefaults(
	defineProps<{
		chartType?: ChartType;
		/** Query result rows. */
		data?: Record<string, unknown>[];
		/** Saved-query chart options; when set, the legacy column props are ignored. */
		widgetOptions?: ChartWidgetOptions | null;
		/** Legacy: the label column when there are no `widgetOptions`. */
		labelColumn?: string;
		/** Legacy: the value column when there are no `widgetOptions`. */
		valueColumn?: string;
		/** Legacy: how labels are read when there are no `widgetOptions`. */
		labelType?: 'values' | 'datetime';
	}>(),
	{
		chartType: 'bar',
		data: () => [],
		widgetOptions: null,
		labelColumn: '',
		valueColumn: '',
		labelType: 'values',
	},
);

const options = computed<ChartWidgetOptions>(
	() =>
		props.widgetOptions ?? {
			label_column: props.labelColumn,
			value_column: props.valueColumn,
			label_type: props.labelType,
		},
);

const chartData = computed(() => {
	const opts = options.value;
	if (!props.data.length || !opts.label_column) return null;
	// At least one value source must exist.
	if (!opts.series?.length && !opts.value_column) return null;
	return buildChartData(props.data, props.chartType, opts);
});

const chartOptions = computed(() => buildChartOptions(props.chartType, options.value));
const chartPlugins = computed(() => [buildDataLabelsPlugin(options.value)]);
const mappedChartType = computed(() => getMappedChartType(props.chartType, options.value));
</script>

<template>
	<div v-if="chartData" class="chart-preview">
		<Chart :type="mappedChartType" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
	</div>
	<div v-else class="chart-preview__no-data">
		<p>No chart data available</p>
	</div>
</template>

<style scoped>
.chart-preview {
	position: relative;
	width: 100%;
	height: 250px;
}

.chart-preview :deep(canvas) {
	max-width: 100%;
	max-height: 100%;
}

.chart-preview__no-data {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 200px;
	color: var(--color-muted);
}
</style>
