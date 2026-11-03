<script setup lang="ts">
// The "Data series" block of the panel editor (chart-edit.component.html): the series mode, the
// series-from-column pickers, or the list of manual series cards.
import { computed } from 'vue';
import { UiButton, UiCheckbox, UiField, UiIcon, UiIconButton, UiInput, UiSelect } from '@/components/ui';
import type { ChartSeriesConfig } from '@/models/saved-query';
import {
	POINT_STYLES,
	type PointStyle,
	SERIES_MODES,
	SERIES_TYPE_OVERRIDES,
	type SelectModel,
	type SeriesMode,
	selected,
	toHex,
	toOptionalNumber,
	useChartEditor,
} from './chartEditor';

const editor = useChartEditor();
const { chartType, isPieType, resultColumns, seriesColumn, seriesList, seriesMode, seriesValueColumn } = editor;

const columnOptions = computed(() => resultColumns.value.map((col) => ({ value: col, label: col })));

function setSeriesMode(value: SelectModel<SeriesMode>): void {
	const choice = selected(value);
	if (choice) seriesMode.value = choice;
}

function setSeriesColumn(value: SelectModel<string>): void {
	const choice = selected(value);
	seriesColumn.value = choice ?? '';
}

function setSeriesValueColumn(value: SelectModel<string>): void {
	const choice = selected(value);
	seriesValueColumn.value = choice ?? '';
}

function onValueColumn(index: number, value: SelectModel<string>): void {
	editor.updateSeries(index, 'value_column', selected(value) ?? '');
}

function isLine(series: ChartSeriesConfig): boolean {
	return chartType.value === 'line' || series.type === 'line';
}

function onColorInput(index: number, event: Event): void {
	editor.updateSeries(index, 'color', (event.target as HTMLInputElement).value);
}

function onTypeOverride(index: number, value: SelectModel<'' | 'bar' | 'line'>): void {
	editor.updateSeries(index, 'type', selected(value) || undefined);
}

function onPointStyle(index: number, value: SelectModel<PointStyle>): void {
	const choice = selected(value);
	if (choice) editor.updateSeries(index, 'point_style', choice);
}
</script>

<template>
	<div class="series-editor">
		<div class="series-editor__header">
			<h4 class="series-editor__title">Data series</h4>
			<UiField v-if="!isPieType" label="Series mode" class="series-editor__mode">
				<UiSelect :model-value="seriesMode" :options="SERIES_MODES" size="sm" @update:model-value="setSeriesMode" />
			</UiField>
		</div>

		<div v-if="seriesMode === 'column' && !isPieType" class="series-editor__columns">
			<UiField label="Series column" hint="Categorical column to split into datasets" class="series-editor__field">
				<UiSelect
					:model-value="seriesColumn || null"
					:options="columnOptions"
					placeholder=""
					@update:model-value="setSeriesColumn"
				/>
			</UiField>
			<UiField label="Value column" hint="Numeric column to chart" class="series-editor__field">
				<UiSelect
					:model-value="seriesValueColumn || null"
					:options="columnOptions"
					placeholder=""
					@update:model-value="setSeriesValueColumn"
				/>
			</UiField>
		</div>

		<template v-if="seriesMode === 'manual' || isPieType">
			<UiButton
				v-if="!isPieType || seriesList.length === 0"
				variant="secondary"
				size="sm"
				class="series-editor__add"
				data-testid="add-series-button"
				@click="editor.addSeries()"
			>
				<template #leading><UiIcon name="add" size="sm" /></template>
				Add series
			</UiButton>

			<div v-for="(series, i) in seriesList" :key="i" class="series-card" :data-testid="`series-card-${i}`">
				<div class="series-card__header">
					<span class="series-card__number">Series {{ i + 1 }}</span>
					<UiIconButton
						v-if="seriesList.length > 1"
						icon="close"
						label="Remove series"
						size="sm"
						@click="editor.removeSeries(i)"
					/>
				</div>

				<div class="series-card__fields">
					<UiField label="Value column" class="series-editor__field">
						<UiSelect
							:model-value="series.value_column || null"
							:options="columnOptions"
							placeholder=""
							@update:model-value="onValueColumn(i, $event)"
						/>
					</UiField>

					<UiField label="Label" class="series-editor__field">
						<UiInput
							:model-value="series.label || ''"
							placeholder="Auto"
							@update:model-value="editor.updateSeries(i, 'label', $event || undefined)"
						/>
					</UiField>

					<div v-if="!isPieType" class="series-card__color">
						<span class="series-card__color-label">Color</span>
						<div class="series-card__color-row">
							<input
								type="color"
								class="color-input"
								:aria-label="`Series ${i + 1} color`"
								:value="toHex(series.color)"
								@input="onColorInput(i, $event)"
							>
							<UiIconButton
								v-if="series.color"
								icon="close"
								label="Reset to auto"
								size="sm"
								@click="editor.updateSeries(i, 'color', undefined)"
							/>
							<span v-else class="series-card__auto">Auto</span>
						</div>
					</div>

					<UiField v-if="!isPieType && chartType !== 'bar'" label="Point style" class="series-editor__field">
						<UiSelect
							:model-value="series.point_style || 'circle'"
							:options="POINT_STYLES"
							@update:model-value="onPointStyle(i, $event)"
						/>
					</UiField>
				</div>

				<div v-if="!isPieType" class="series-card__options">
					<UiCheckbox
						v-if="isLine(series)"
						:model-value="series.fill || false"
						@update:model-value="editor.updateSeries(i, 'fill', $event)"
					>
						Fill area
					</UiCheckbox>

					<UiField v-if="isLine(series)" label="Tension" class="series-editor__field series-editor__field--small">
						<UiInput
							type="number"
							min="0"
							max="1"
							step="0.1"
							:model-value="series.tension ?? 0"
							@update:model-value="editor.updateSeries(i, 'tension', toOptionalNumber($event) ?? undefined)"
						/>
					</UiField>

					<UiField v-if="seriesList.length > 1" label="Type override" class="series-editor__field">
						<UiSelect
							:model-value="series.type || ''"
							:options="SERIES_TYPE_OVERRIDES"
							@update:model-value="onTypeOverride(i, $event)"
						/>
					</UiField>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.series-editor {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	margin-top: var(--space-2);
}

.series-editor__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
}

.series-editor__title {
	margin: 0;
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
}

.series-editor__mode {
	min-width: 10rem;
}

.series-editor__columns,
.series-card__fields {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-3);
}

.series-editor__field {
	flex: 1;
	min-width: 7.5rem;
}

.series-editor__field--small {
	flex: 0 1 auto;
	min-width: 5rem;
	max-width: 6.25rem;
}

.series-editor__add {
	align-self: flex-start;
}

.series-card {
	padding: var(--space-3);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
}

.series-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--space-8);
	margin-bottom: var(--space-2);
}

.series-card__number {
	font-size: var(--text-xs);
	font-weight: var(--weight-medium);
	text-transform: uppercase;
	color: var(--color-muted);
}

.series-card__color {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	min-width: 5rem;
}

.series-card__color-label {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.series-card__color-row {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.series-card__auto {
	font-size: var(--text-xs);
	color: var(--color-muted-soft);
}

.series-card__options {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--space-4);
	margin-top: var(--space-1);
}

.color-input {
	width: 2.25rem;
	height: 2.25rem;
	padding: var(--space-05);
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
	background: none;
	cursor: pointer;
}
</style>
