<script setup lang="ts">
// Port of frontend/src/app/components/dashboards/panel-renderers/counter-panel: the first row's
// value column as one big number (1.2K / 3.4M), labelled by its label column or the column name.
import { computed } from 'vue';
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

const firstRow = computed(() => (props.preloadedQuery ? props.preloadedData[0] : undefined));

const valueColumn = computed(() => {
	const stored = props.preloadedQuery?.widget_options?.value_column as string | undefined;
	if (stored) return stored;
	return firstRow.value ? Object.keys(firstRow.value)[0] || null : null;
});

const counterValue = computed(() => {
	const row = firstRow.value;
	if (!row || !valueColumn.value) return null;
	const value = row[valueColumn.value];
	return typeof value === 'number' ? formatNumber(value) : String(value);
});

const label = computed(() => {
	const row = firstRow.value;
	if (!row) return '';
	const labelColumn = props.preloadedQuery?.widget_options?.label_column as string | undefined;
	if (labelColumn && row[labelColumn]) return String(row[labelColumn]);
	return valueColumn.value || '';
});

function formatNumber(value: number): string {
	if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
	if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
	return value.toLocaleString();
}
</script>

<template>
	<div v-if="counterValue !== null" class="counter-panel">
		<span class="counter-panel__value">{{ counterValue }}</span>
		<span v-if="label" class="counter-panel__label">{{ label }}</span>
	</div>
	<div v-else class="counter-panel counter-panel--empty">
		<p>No data available</p>
	</div>
</template>

<style scoped>
.counter-panel {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	text-align: center;
}

.counter-panel--empty {
	color: var(--color-muted);
}

.counter-panel--empty p {
	margin: 0;
}

.counter-panel__value {
	font-family: var(--font-display);
	font-size: var(--text-2xl);
	font-weight: var(--weight-bold);
	line-height: 1;
	color: var(--color-accent);
}

.counter-panel__label {
	margin-top: var(--space-2);
	font-size: var(--text-sm);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--color-muted);
}
</style>
