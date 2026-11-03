<script setup lang="ts">
// The "advanced options" accordion of the panel editor (chart-edit.component.html): display,
// units & formatting, axes, data options and the custom colour palette.
import {
	UiAccordion,
	UiButton,
	UiCheckbox,
	UiExpansionPanel,
	UiField,
	UiIcon,
	UiIconButton,
	UiInput,
	UiSelect,
} from '@/components/ui';
import {
	CONVERT_UNIT_OPTIONS,
	LEGEND_POSITIONS,
	type LegendPosition,
	SCALE_TYPES,
	type ScaleType,
	type SelectModel,
	SORT_OPTIONS,
	type SortBy,
	selected,
	toHex,
	toOptionalNumber,
	UNIT_MODES,
	UNIT_POSITIONS,
	type UnitMode,
	useChartEditor,
} from './chartEditor';

const editor = useChartEditor();
const {
	chartType,
	colorPalette,
	compact,
	convertUnit,
	decimalPlaces,
	horizontal,
	isPieType,
	legendPosition,
	legendShow,
	limit,
	showDataLabels,
	sortBy,
	stacked,
	thousandsSeparator,
	unitMode,
	unitsPosition,
	unitsText,
	xAxisTitle,
	yAxisBeginAtZero,
	yAxisMax,
	yAxisMin,
	yAxisScaleType,
	yAxisTitle,
} = editor;

function setLegendPosition(value: SelectModel<LegendPosition>): void {
	const choice = selected(value);
	if (choice) legendPosition.value = choice;
}

function setUnitMode(value: SelectModel<UnitMode>): void {
	const choice = selected(value);
	if (choice) unitMode.value = choice;
}

function setUnitsPosition(value: SelectModel<'prefix' | 'suffix'>): void {
	const choice = selected(value);
	if (choice) unitsPosition.value = choice;
}

function setConvertUnit(value: SelectModel<string>): void {
	const choice = selected(value);
	convertUnit.value = choice ?? '';
}

function setScaleType(value: SelectModel<ScaleType>): void {
	const choice = selected(value);
	if (choice) yAxisScaleType.value = choice;
}

function setSortBy(value: SelectModel<SortBy>): void {
	const choice = selected(value);
	if (choice) sortBy.value = choice;
}

function setDecimalPlaces(value: string): void {
	decimalPlaces.value = toOptionalNumber(value);
}

function setYAxisMin(value: string): void {
	yAxisMin.value = toOptionalNumber(value);
}

function setYAxisMax(value: string): void {
	yAxisMax.value = toOptionalNumber(value);
}

function setLimit(value: string): void {
	limit.value = toOptionalNumber(value);
}

function onPaletteInput(index: number, event: Event): void {
	editor.updatePaletteColor(index, (event.target as HTMLInputElement).value);
}
</script>

<template>
	<UiAccordion class="advanced-options">
		<UiExpansionPanel title="Display options">
			<div class="advanced-options__group">
				<UiCheckbox v-if="!isPieType" v-model="stacked">Stacked</UiCheckbox>
				<UiCheckbox v-if="chartType === 'bar'" v-model="horizontal">Horizontal</UiCheckbox>
				<UiCheckbox v-model="showDataLabels">Show data labels</UiCheckbox>
				<UiCheckbox v-model="legendShow">Show legend</UiCheckbox>
				<UiField v-if="legendShow" label="Legend position" class="advanced-options__field">
					<UiSelect :model-value="legendPosition" :options="LEGEND_POSITIONS" @update:model-value="setLegendPosition" />
				</UiField>
			</div>
		</UiExpansionPanel>

		<UiExpansionPanel title="Units & formatting">
			<div class="advanced-options__group">
				<UiField label="Unit mode" class="advanced-options__field">
					<UiSelect :model-value="unitMode" :options="UNIT_MODES" @update:model-value="setUnitMode" />
				</UiField>

				<div v-if="unitMode === 'custom'" class="advanced-options__inline">
					<UiField label="Unit text" class="advanced-options__field">
						<UiInput v-model="unitsText" placeholder="e.g. $, %, EUR" />
					</UiField>
					<UiField label="Unit position" class="advanced-options__field">
						<UiSelect :model-value="unitsPosition" :options="UNIT_POSITIONS" @update:model-value="setUnitsPosition" />
					</UiField>
				</div>

				<UiField
					v-if="unitMode === 'convert'"
					label="Source unit"
					hint="Values auto-convert to the best readable unit"
					class="advanced-options__field"
				>
					<UiSelect
						:model-value="convertUnit || null"
						:options="CONVERT_UNIT_OPTIONS"
						placeholder=""
						@update:model-value="setConvertUnit"
					/>
				</UiField>

				<template v-if="unitMode !== 'convert'">
					<div class="advanced-options__inline">
						<UiField label="Decimal places" class="advanced-options__field">
							<UiInput
								type="number"
								min="0"
								max="10"
								:model-value="decimalPlaces"
								@update:model-value="setDecimalPlaces"
							/>
						</UiField>
					</div>
					<UiCheckbox v-model="thousandsSeparator">Thousands separator</UiCheckbox>
					<UiCheckbox v-model="compact">Compact notation (1K, 1M, 1B)</UiCheckbox>
				</template>
			</div>
		</UiExpansionPanel>

		<UiExpansionPanel v-if="!isPieType" title="Axis configuration">
			<div class="advanced-options__group">
				<h4 class="advanced-options__axis">Y-Axis</h4>
				<div class="advanced-options__inline">
					<UiField label="Title" class="advanced-options__field">
						<UiInput v-model="yAxisTitle" />
					</UiField>
					<UiField label="Scale type" class="advanced-options__field">
						<UiSelect :model-value="yAxisScaleType" :options="SCALE_TYPES" @update:model-value="setScaleType" />
					</UiField>
				</div>
				<div class="advanced-options__inline">
					<UiField label="Min" class="advanced-options__field">
						<UiInput type="number" :model-value="yAxisMin" @update:model-value="setYAxisMin" />
					</UiField>
					<UiField label="Max" class="advanced-options__field">
						<UiInput type="number" :model-value="yAxisMax" @update:model-value="setYAxisMax" />
					</UiField>
				</div>
				<UiCheckbox v-model="yAxisBeginAtZero">Begin at zero</UiCheckbox>

				<h4 class="advanced-options__axis">X-Axis</h4>
				<UiField label="Title" class="advanced-options__field">
					<UiInput v-model="xAxisTitle" />
				</UiField>
			</div>
		</UiExpansionPanel>

		<UiExpansionPanel title="Data options">
			<div class="advanced-options__group">
				<div class="advanced-options__inline">
					<UiField label="Sort by" class="advanced-options__field">
						<UiSelect :model-value="sortBy" :options="SORT_OPTIONS" @update:model-value="setSortBy" />
					</UiField>
					<UiField label="Limit" class="advanced-options__field">
						<UiInput
							type="number"
							min="1"
							max="10000"
							placeholder="No limit"
							:model-value="limit"
							@update:model-value="setLimit"
						/>
					</UiField>
				</div>
			</div>
		</UiExpansionPanel>

		<UiExpansionPanel title="Custom color palette">
			<div class="advanced-options__group">
				<div class="advanced-options__palette">
					<div v-for="(color, i) in colorPalette" :key="i" class="advanced-options__swatch">
						<input
							type="color"
							class="color-input"
							:aria-label="`Palette color ${i + 1}`"
							:value="toHex(color)"
							@input="onPaletteInput(i, $event)"
						>
						<UiIconButton icon="close" label="Remove color" size="sm" @click="editor.removePaletteColor(i)" />
					</div>
				</div>
				<div class="advanced-options__palette-actions">
					<UiButton variant="secondary" size="sm" @click="editor.addPaletteColor()">
						<template #leading><UiIcon name="add" size="sm" /></template>
						Add color
					</UiButton>
					<UiButton
						v-if="colorPalette.length === 0"
						variant="secondary"
						size="sm"
						@click="editor.initializeDefaultPalette()"
					>
						<template #leading><UiIcon name="palette" size="sm" /></template>
						Load defaults
					</UiButton>
				</div>
			</div>
		</UiExpansionPanel>
	</UiAccordion>
</template>

<style scoped>
.advanced-options {
	margin-top: var(--space-2);
}

.advanced-options__group {
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
	padding: var(--space-1) 0;
}

.advanced-options__field {
	min-width: 7.5rem;
}

.advanced-options__inline {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-3);
}

.advanced-options__inline .advanced-options__field {
	flex: 1;
}

.advanced-options__axis {
	margin: var(--space-2) 0 0;
	font-size: var(--text-sm);
	font-weight: var(--weight-medium);
	color: var(--color-muted);
}

.advanced-options__palette,
.advanced-options__palette-actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-2);
}

.advanced-options__swatch {
	display: flex;
	align-items: center;
	gap: var(--space-05);
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
