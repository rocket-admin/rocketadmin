<script setup lang="ts">
// Port of frontend/src/app/components/charts/chart-edit: create (/panels/:connectionId/new) or edit
// (/panels/:connectionId/:queryId) a panel — a saved SQL query with its chart configuration. The
// query can be generated with AI, tested to get columns and a live preview, then saved.
//
// The chart configuration lives in createChartEditorState() (components/charts/chartEditor.ts),
// which the series and advanced-option sections inject.
import { computed, onMounted, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChartAdvancedOptions from '@/components/charts/ChartAdvancedOptions.vue';
import ChartPreview from '@/components/charts/ChartPreview.vue';
import ChartSeriesEditor from '@/components/charts/ChartSeriesEditor.vue';
import {
	CHART_TYPES,
	createChartEditorState,
	LABEL_TYPES,
	type LabelType,
	provideChartEditor,
	type SelectModel,
	selected,
} from '@/components/charts/chartEditor';
import { trackDashboardsEvent } from '@/components/dashboards/analytics';
import DashboardsSidebar from '@/components/dashboards/DashboardsSidebar.vue';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppCodeEditor from '@/components/shared/AppCodeEditor.vue';
import {
	type TableColumn,
	UiButton,
	UiExpansionPanel,
	UiField,
	UiIcon,
	UiInput,
	UiSelect,
	UiSpinner,
	UiTable,
	UiTextarea,
} from '@/components/ui';
import type { ChartType, ChartWidgetOptions, GeneratedPanelWithPosition } from '@/models/saved-query';
import { useConnectionsStore } from '@/stores/connections';
import { useDashboardsStore } from '@/stores/dashboards';
import { useSavedQueriesStore } from '@/stores/saved-queries';

const VALID_CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'polarArea'];

const route = useRoute();
const router = useRouter();
const savedQueries = useSavedQueriesStore();
const dashboards = useDashboardsStore();
const connections = useConnectionsStore();

const editor = createChartEditorState();
provideChartEditor(editor);
const {
	chartType,
	currentWidgetOptions,
	hasChartData,
	labelColumn,
	labelType,
	resultColumns,
	showLabelTypeOption,
	testResults,
} = editor;

const connectionId = computed(() => String(route.params.connectionId ?? ''));
const queryId = computed(() => String(route.params.queryId ?? ''));
const isEditMode = computed(() => !!queryId.value);

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);

const queryName = ref('');
const queryDescription = ref('');
const queryText = ref('');

const executionTime = ref<number | null>(null);
const showResults = ref(false);

// AI generation
const aiDescription = ref('');
const aiGenerating = ref(false);
const aiExpanded = ref(true);
const manualExpanded = ref(false);
const canGenerate = computed(() => !!aiDescription.value.trim() && !aiGenerating.value);

const canSave = computed(() => !!queryName.value.trim() && !!queryText.value.trim() && !saving.value);
const canTest = computed(() => !!queryText.value.trim() && !testing.value);

const columnOptions = computed(() => resultColumns.value.map((col) => ({ value: col, label: col })));
const resultTableColumns = computed<TableColumn<Record<string, unknown>>[]>(() =>
	resultColumns.value.map((col) => ({ key: col, label: col })),
);

watchEffect(() => {
	const pageTitle = isEditMode.value ? 'Edit Query' : 'Create Query';
	document.title = `${pageTitle} | ${connections.connectionTitle || 'Rocketadmin'}`;
});

onMounted(() => {
	if (isEditMode.value) {
		manualExpanded.value = true;
		aiExpanded.value = false;
		loadSavedQuery();
	} else {
		loading.value = false;
	}
});

async function loadSavedQuery(): Promise<void> {
	loading.value = true;
	try {
		const query = await savedQueries.fetchSavedQuery(connectionId.value, queryId.value);
		if (query) {
			queryName.value = query.name;
			queryDescription.value = query.description || '';
			queryText.value = query.query_text;
			if (query.chart_type) chartType.value = query.chart_type;
			if (query.widget_options) {
				editor.applyWidgetOptions(query.widget_options as Partial<ChartWidgetOptions>, 'saved');
			}
			testQuery();
		}
	} catch {
		// The client has shown the error.
	} finally {
		loading.value = false;
	}
}

async function testQuery(): Promise<void> {
	if (!queryText.value.trim()) return;

	testing.value = true;
	showResults.value = false;
	try {
		const result = await savedQueries.testQuery(connectionId.value, { query_text: queryText.value });
		if (result) {
			editor.applyTestResults(result.data);
			executionTime.value = result.execution_time_ms;
			showResults.value = true;
		}
	} catch {
		// The client has shown the error.
	} finally {
		testing.value = false;
	}

	trackDashboardsEvent('Charts: test query executed');
}

async function saveQuery(): Promise<void> {
	if (!queryName.value.trim() || !queryText.value.trim()) return;

	saving.value = true;
	const payload = {
		name: queryName.value,
		description: queryDescription.value || undefined,
		query_text: queryText.value,
		widget_type: 'chart' as const,
		chart_type: chartType.value,
		widget_options: currentWidgetOptions.value as unknown as Record<string, unknown>,
	};

	try {
		if (isEditMode.value) {
			const result = await savedQueries.updateSavedQuery(connectionId.value, queryId.value, payload);
			if (result) router.push(`/panels/${connectionId.value}`);
			trackDashboardsEvent('Charts: saved query updated');
		} else {
			const result = await savedQueries.createSavedQuery(connectionId.value, payload);
			if (result) router.push(`/panels/${connectionId.value}`);
			trackDashboardsEvent('Charts: saved query created');
		}
	} catch {
		// The client has shown the error.
	} finally {
		saving.value = false;
	}
}

async function generateWithAi(): Promise<void> {
	if (!aiDescription.value.trim()) return;

	aiGenerating.value = true;
	try {
		const result = await dashboards.generateWidgetWithAi(connectionId.value, {
			chart_description: aiDescription.value,
		});
		if (result) {
			applyAiResponse(result);
			aiExpanded.value = false;
			manualExpanded.value = true;
			await testQuery();
		}
	} catch {
		// The client has shown the error.
	} finally {
		aiGenerating.value = false;
	}

	trackDashboardsEvent('Charts: AI generation used');
}

function applyAiResponse(result: GeneratedPanelWithPosition): void {
	if (result.name) queryName.value = result.name;
	if (result.description) queryDescription.value = result.description;
	if (result.query_text) queryText.value = result.query_text;
	if (result.chart_type && VALID_CHART_TYPES.includes(result.chart_type as ChartType)) {
		chartType.value = result.chart_type as ChartType;
	}
	if (result.widget_options) {
		editor.applyWidgetOptions(result.widget_options as Partial<ChartWidgetOptions>, 'ai');
	}
}

function setChartType(value: SelectModel<ChartType>): void {
	const choice = selected(value);
	if (choice) chartType.value = choice;
}

function setLabelColumn(value: SelectModel<string>): void {
	const choice = selected(value);
	labelColumn.value = choice ?? '';
}

function setLabelType(value: SelectModel<LabelType>): void {
	const choice = selected(value);
	if (choice) labelType.value = choice;
}
</script>

<template>
	<div class="chart-edit">
		<DashboardsSidebar :connection-id="connectionId" active-tab="queries" />

		<div class="chart-edit__main">
			<AppAlert />

			<div class="chart-edit__page">
				<h1 class="chart-edit__title">{{ isEditMode ? 'Edit panel' : 'Create panel' }}</h1>

				<div v-if="loading" class="chart-edit__loading">
					<UiSpinner size="lg" label="Loading panel" />
				</div>

				<div v-else class="chart-edit__content">
					<UiExpansionPanel v-model:open="aiExpanded" class="chart-edit__ai" data-testid="ai-section">
						<template #title>
							<span class="chart-edit__section-title">
								<UiIcon name="auto_awesome" size="sm" class="chart-edit__ai-icon" />
								Generate with AI
							</span>
						</template>
						<div class="chart-edit__ai-body">
							<UiField label="Chart description" hint="Describe the chart you want in natural language">
								<UiTextarea
									v-model="aiDescription"
									:rows="2"
									placeholder="e.g. Show monthly revenue by product category as a bar chart"
									data-testid="ai-description-input"
								/>
							</UiField>
							<div class="chart-edit__ai-actions">
								<UiButton
									:loading="aiGenerating"
									:disabled="!canGenerate"
									data-testid="ai-generate-button"
									@click="generateWithAi"
								>
									<template v-if="!aiGenerating" #leading><UiIcon name="auto_awesome" size="sm" /></template>
									{{ aiGenerating ? 'Generating...' : 'Generate' }}
								</UiButton>
							</div>
						</div>
					</UiExpansionPanel>

					<section v-if="showResults" class="chart-edit__preview" data-testid="chart-preview-section">
						<div class="chart-edit__section-header">
							<h3 class="chart-edit__heading">Chart preview</h3>
							<span v-if="executionTime !== null" class="chart-edit__execution-time">
								Executed in {{ executionTime }}ms
							</span>
						</div>
						<div v-if="hasChartData" class="chart-edit__chart">
							<ChartPreview
								:chart-type="chartType"
								:data="testResults"
								:widget-options="currentWidgetOptions"
							/>
						</div>
						<div v-if="!hasChartData && testResults.length > 0" class="chart-edit__no-chart">
							<p>Add at least one data series to display the chart</p>
						</div>
					</section>

					<div v-if="showResults && testResults.length === 0" class="chart-edit__no-results">
						<UiIcon name="info" class="chart-edit__no-results-icon" />
						<p>Query executed successfully but returned no results.</p>
					</div>

					<UiExpansionPanel v-model:open="manualExpanded" class="chart-edit__manual" data-testid="manual-section">
						<template #title>
							<span class="chart-edit__section-title">
								<UiIcon name="tune" size="sm" class="chart-edit__manual-icon" />
								Manual configuration
							</span>
						</template>
						<div class="chart-edit__manual-body">
							<div class="chart-edit__details">
								<UiField label="Query name" required class="chart-edit__name">
									<UiInput
										v-model="queryName"
										placeholder="Enter a name for this query"
										data-testid="query-name-input"
									/>
								</UiField>
								<UiField label="Description (optional)" class="chart-edit__description">
									<UiInput
										v-model="queryDescription"
										placeholder="Add a description"
										data-testid="query-description-input"
									/>
								</UiField>
							</div>

							<div class="chart-edit__grid">
								<div class="chart-edit__column">
									<div class="chart-edit__section-header">
										<h3 class="chart-edit__heading">SQL query</h3>
										<UiButton
											variant="secondary"
											:loading="testing"
											:disabled="!canTest"
											data-testid="test-query-button"
											@click="testQuery"
										>
											<template v-if="!testing" #leading><UiIcon name="play_arrow" size="sm" /></template>
											{{ testing ? 'Testing...' : 'Test query' }}
										</UiButton>
									</div>
									<div class="chart-edit__code ph-no-capture">
										<AppCodeEditor
											v-model="queryText"
											language="sql"
											label="SQL query"
											height="300px"
											:options="{ lineNumbers: 'on' }"
										/>
									</div>
								</div>

								<div v-if="showResults" class="chart-edit__column">
									<div class="chart-edit__config">
										<h3 class="chart-edit__heading">Chart configuration</h3>
										<div class="chart-edit__config-fields">
											<UiField label="Chart type" class="chart-edit__config-field">
												<UiSelect
													:model-value="chartType"
													:options="CHART_TYPES"
													data-testid="chart-type-select"
													@update:model-value="setChartType"
												/>
											</UiField>
											<UiField label="Label column" class="chart-edit__config-field">
												<UiSelect
													:model-value="labelColumn || null"
													:options="columnOptions"
													placeholder=""
													data-testid="label-column-select"
													@update:model-value="setLabelColumn"
												/>
											</UiField>
											<UiField v-if="showLabelTypeOption" label="Label type" class="chart-edit__config-field">
												<UiSelect
													:model-value="labelType"
													:options="LABEL_TYPES"
													data-testid="label-type-select"
													@update:model-value="setLabelType"
												/>
											</UiField>
										</div>
										<ChartSeriesEditor />
									</div>
									<ChartAdvancedOptions />
								</div>
							</div>

							<section v-if="showResults && testResults.length > 0" class="chart-edit__results">
								<h3 class="chart-edit__heading">Query results ({{ testResults.length }} rows)</h3>
								<UiTable
									class="chart-edit__results-table"
									:columns="resultTableColumns"
									:rows="testResults"
									label="Query results"
									size="sm"
									sticky-header
								/>
							</section>
						</div>
					</UiExpansionPanel>
				</div>
			</div>

			<div v-if="!loading" class="chart-edit__actions">
				<UiButton variant="secondary" :to="`/panels/${connectionId}`" data-testid="cancel-button">Back</UiButton>
				<UiButton :loading="saving" :disabled="!canSave" data-testid="save-query-button" @click="saveQuery">
					{{ saving ? 'Saving...' : isEditMode ? 'Update query' : 'Save query' }}
				</UiButton>
			</div>
		</div>
	</div>
</template>

<style scoped>
.chart-edit {
	display: flex;
	height: calc(100vh - var(--header-height) - var(--footer-height));
	overflow: hidden;
}

.chart-edit__main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	overflow-y: auto;
	background: var(--color-paper);
}

.chart-edit__page {
	display: flex;
	flex: 1;
	flex-direction: column;
	box-sizing: border-box;
	width: 100%;
	max-width: 1400px;
	margin: var(--space-12) auto;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
}

.chart-edit__title {
	margin: 0 0 var(--space-8);
	font-family: var(--font-display);
	font-size: var(--text-xl);
	font-weight: var(--weight-semibold);
	color: var(--color-ink);
}

.chart-edit__loading {
	display: flex;
	justify-content: center;
	padding: var(--space-16);
}

.chart-edit__content {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--space-6);
	padding-bottom: var(--space-6);
}

.chart-edit__ai,
.chart-edit__manual {
	border: 1px solid var(--color-line);
	border-radius: var(--radius-panel);
	background: var(--color-surface);
}

.chart-edit__section-title {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	font-weight: var(--weight-medium);
}

.chart-edit__ai-icon {
	color: var(--color-accent);
}

.chart-edit__manual-icon {
	color: var(--color-muted);
}

.chart-edit__ai-body {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.chart-edit__ai-actions {
	display: flex;
	justify-content: flex-end;
}

.chart-edit__preview,
.chart-edit__config,
.chart-edit__results {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}

.chart-edit__section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
}

.chart-edit__heading {
	margin: 0;
	font-size: var(--text-md);
	font-weight: var(--weight-medium);
}

.chart-edit__execution-time {
	font-size: var(--text-xs);
	color: var(--color-muted);
}

.chart-edit__chart {
	min-height: 250px;
	padding: var(--space-4);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
}

.chart-edit__no-chart {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
	text-align: center;
	color: var(--color-muted);
}

.chart-edit__no-results {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-6);
	border-radius: var(--radius-control);
	background: var(--color-paper-2);
	color: var(--color-muted);
}

.chart-edit__no-results p {
	margin: 0;
}

.chart-edit__no-results-icon {
	color: var(--color-accent);
}

.chart-edit__manual-body {
	display: flex;
	flex-direction: column;
	gap: var(--space-6);
}

.chart-edit__details {
	display: flex;
	gap: var(--space-4);
	margin-top: var(--space-2);
}

.chart-edit__name {
	flex: 1;
	max-width: 300px;
}

.chart-edit__description {
	flex: 2;
}

.chart-edit__grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--space-6);
}

.chart-edit__column {
	display: flex;
	flex-direction: column;
	gap: var(--space-6);
	min-width: 0;
}

.chart-edit__code {
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: var(--radius-control);
}

.chart-edit__config-fields {
	display: flex;
	flex-wrap: wrap;
	gap: var(--space-4);
}

.chart-edit__config-field {
	flex: 1;
	min-width: 150px;
}

.chart-edit__results-table {
	max-height: 300px;
}

.chart-edit__actions {
	position: sticky;
	bottom: 0;
	z-index: var(--z-sticky);
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-4);
	height: 64px;
	padding: 0 clamp(var(--space-10), 5vw, 100px);
	background: var(--color-surface);
	box-shadow: var(--shadow-card);
}

@media (width <= 900px) {
	.chart-edit__grid {
		grid-template-columns: 1fr;
	}
}

@media (width <= 600px) {
	.chart-edit__page {
		margin: var(--space-6) auto;
		padding: 0 var(--space-4);
	}

	.chart-edit__details {
		flex-direction: column;
	}

	.chart-edit__name {
		max-width: 100%;
	}

	.chart-edit__actions {
		padding: 0 var(--space-4);
	}
}
</style>
