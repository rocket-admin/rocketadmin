import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CodeEditorModule } from '@ngstack/code-editor';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import {
	buildChartOptionsFields,
	ChartOptionsModel,
	DEFAULT_CHART_OPTIONS_MODEL,
} from 'src/app/formly/chart-options-fields';
import {
	ChartAxisConfig,
	ChartLegendConfig,
	ChartNumberFormatConfig,
	ChartSeriesConfig,
	ChartType,
	ChartUnitConfig,
	ChartWidgetOptions,
	GeneratedPanelWithPosition,
} from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { DashboardsSidebarComponent } from '../../dashboards/dashboards-sidebar/dashboards-sidebar.component';
import { AlertComponent } from '../../ui-components/alert/alert.component';
import { ChartPreviewComponent } from '../chart-preview/chart-preview.component';

@Component({
	selector: 'app-chart-edit',
	templateUrl: './chart-edit.component.html',
	styleUrls: ['./chart-edit.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
		MatButtonModule,
		MatIconModule,
		MatInputModule,
		MatFormFieldModule,
		MatTableModule,
		MatTooltipModule,
		MatProgressSpinnerModule,
		CodeEditorModule,
		FormlyModule,
		ChartPreviewComponent,
		AlertComponent,
		DashboardsSidebarComponent,
	],
})
export class ChartEditComponent implements OnInit {
	protected connectionId = signal('');
	protected queryId = signal('');
	protected isEditMode = signal(false);
	protected loading = signal(true);
	protected saving = signal(false);
	protected testing = signal(false);

	protected queryName = signal('');
	protected queryDescription = signal('');
	protected queryText = signal('');

	protected testResults = signal<Record<string, unknown>[]>([]);
	protected resultColumns = signal<string[]>([]);
	protected executionTime = signal<number | null>(null);
	protected showResults = signal(false);

	// AI generation
	protected aiDescription = signal('');
	protected aiGenerating = signal(false);
	protected aiExpanded = signal(true);
	protected manualExpanded = signal(false);
	protected canGenerate = computed(() => !!this.aiDescription().trim() && !this.aiGenerating());

	// Formly form
	protected chartForm = new FormGroup({});
	protected chartModel: ChartOptionsModel = { ...DEFAULT_CHART_OPTIONS_MODEL };
	protected chartFields: FormlyFieldConfig[] = [];

	protected codeModel = signal({
		language: 'sql',
		uri: 'query.sql',
		value: '',
	});

	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on' as const,
		lineNumbers: 'on' as const,
	};
	public codeEditorTheme = 'vs-dark';

	protected canSave = computed(() => !!this.queryName().trim() && !!this.queryText().trim() && !this.saving());
	protected canTest = computed(() => !!this.queryText().trim() && !this.testing());

	protected hasChartData = computed(() => {
		this._modelVersion();
		const model = this.chartModel;
		const hasLabel = !!model.labelColumn;
		if (model.seriesMode === 'column') {
			return this.testResults().length > 0 && hasLabel && !!model.seriesColumn && !!model.seriesValueColumn;
		}
		const hasSeries = model.seriesList.length > 0 && model.seriesList.some((s) => !!s.value_column);
		return this.testResults().length > 0 && hasLabel && hasSeries;
	});

	protected currentWidgetOptions = computed<ChartWidgetOptions>(() => {
		this._modelVersion();

		const model = this.chartModel;
		const options: ChartWidgetOptions = {
			label_column: model.labelColumn,
			label_type: model.labelType as 'values' | 'datetime',
		};

		if (model.seriesMode === 'column' && model.seriesColumn) {
			options.series_column = model.seriesColumn;
			options.value_column = model.seriesValueColumn;
		} else {
			const series = model.seriesList;
			if (series.length > 0) {
				options.series = series as ChartSeriesConfig[];
			}
		}

		if (model.stacked) options.stacked = true;
		if (model.horizontal) options.horizontal = true;
		if (model.showDataLabels) options.show_data_labels = true;

		if (!model.legendShow || model.legendPosition !== 'top') {
			options.legend = {
				show: model.legendShow,
				position: model.legendPosition as ChartLegendConfig['position'],
			};
		}

		if (model.unitMode === 'custom' && model.unitsText) {
			options.units = { text: model.unitsText, position: model.unitsPosition as ChartUnitConfig['position'] };
		} else if (model.unitMode === 'convert' && model.convertUnit) {
			options.units = { convert_unit: model.convertUnit };
		}

		const numberFormat: ChartNumberFormatConfig = {};
		if (model.decimalPlaces !== null) numberFormat.decimal_places = model.decimalPlaces;
		if (!model.thousandsSeparator) numberFormat.thousands_separator = false;
		if (model.compact) numberFormat.compact = true;
		if (Object.keys(numberFormat).length > 0) options.number_format = numberFormat;

		const yAxis: ChartAxisConfig = {};
		if (model.yAxisTitle) yAxis.title = model.yAxisTitle;
		if (model.yAxisMin !== null) yAxis.min = model.yAxisMin;
		if (model.yAxisMax !== null) yAxis.max = model.yAxisMax;
		if (!model.yAxisBeginAtZero) yAxis.begin_at_zero = false;
		if (model.yAxisScaleType !== 'linear') yAxis.scale_type = model.yAxisScaleType as ChartAxisConfig['scale_type'];
		if (Object.keys(yAxis).length > 0) options.y_axis = yAxis;

		const xAxis: ChartAxisConfig = {};
		if (model.xAxisTitle) xAxis.title = model.xAxisTitle;
		if (Object.keys(xAxis).length > 0) options.x_axis = xAxis;

		if (model.sortBy !== 'none') options.sort_by = model.sortBy as ChartWidgetOptions['sort_by'];
		if (model.limit !== null && model.limit > 0) options.limit = model.limit;

		const palette = model.colorPalette;
		if (palette.length > 0) options.color_palette = palette;

		return options;
	});

	protected chartType = computed(() => {
		this._modelVersion();
		return this.chartModel.chartType as ChartType;
	});

	// Bumped on every formly model change to trigger computed signal recalculation
	private _modelVersion = signal(0);

	private _savedQueries = inject(SavedQueriesService);
	private _connections = inject(ConnectionsService);
	private _dashboards = inject(DashboardsService);
	private _uiSettings = inject(UiSettingsService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private angulartics2 = inject(Angulartics2);
	private title = inject(Title);

	private connectionTitle = toSignal(this._connections.getCurrentConnectionTitle(), { initialValue: '' });

	constructor() {
		effect(() => {
			const title = this.connectionTitle();
			const pageTitle = this.isEditMode() ? 'Edit Query' : 'Create Query';
			this.title.setTitle(`${pageTitle} | ${title || 'Rocketadmin'}`);
		});
	}

	ngOnInit(): void {
		this.connectionId.set(this.route.snapshot.paramMap.get('connection-id') || '');
		this.queryId.set(this.route.snapshot.paramMap.get('query-id') || '');
		this.isEditMode.set(!!this.queryId());

		this.codeEditorTheme = this._uiSettings.isDarkMode ? 'vs-dark' : 'vs';

		// Build formly fields with dynamic column options
		this.chartFields = buildChartOptionsFields(this.resultColumns);

		if (this.isEditMode()) {
			this.manualExpanded.set(true);
			this.aiExpanded.set(false);
			this.loadSavedQuery();
		} else {
			this.loading.set(false);
		}

		this._loadAiPrerequisites();
	}

	onModelChange(model: ChartOptionsModel): void {
		this.chartModel = {
			...model,
			seriesList: model.seriesList.map((s) => ({ ...s })),
			colorPalette: [...model.colorPalette],
		};
		this._modelVersion.update((v) => v + 1);
	}

	async loadSavedQuery(): Promise<void> {
		this.loading.set(true);
		try {
			const query = await this._savedQueries.fetchSavedQuery(this.connectionId(), this.queryId());

			if (query) {
				this.queryName.set(query.name);
				this.queryDescription.set(query.description || '');
				this.queryText.set(query.query_text);

				const newModel: ChartOptionsModel = { ...DEFAULT_CHART_OPTIONS_MODEL };

				if (query.chart_type) {
					newModel.chartType = query.chart_type;
				}

				if (query.widget_options) {
					const opts = query.widget_options as Partial<ChartWidgetOptions>;
					this._applyWidgetOptionsToModel(opts, newModel);
				}

				this.chartModel = newModel;
				this._modelVersion.update((v) => v + 1);
				this.codeModel.set({ language: 'sql', uri: 'query.sql', value: query.query_text });
				this.testQuery();
			}
		} finally {
			this.loading.set(false);
		}
	}

	onCodeChange(value: string): void {
		this.queryText.set(value);
	}

	async testQuery(): Promise<void> {
		if (!this.queryText().trim()) {
			return;
		}

		this.testing.set(true);
		this.showResults.set(false);

		try {
			const result = await this._savedQueries.testQuery(this.connectionId(), { query_text: this.queryText() });

			if (result) {
				this.testResults.set(result.data);
				this.executionTime.set(result.execution_time_ms);
				this.resultColumns.set(result.data.length > 0 ? Object.keys(result.data[0]) : []);
				this.showResults.set(true);

				const updates: Partial<ChartOptionsModel> = {};
				if (this.resultColumns().length > 0 && !this.chartModel.labelColumn) {
					updates.labelColumn = this.resultColumns()[0];
				}
				if (this.chartModel.seriesList.length === 0 && this.resultColumns().length > 1) {
					updates.seriesList = [{ value_column: this.resultColumns()[1] }];
				}
				if (Object.keys(updates).length > 0) {
					this.chartModel = { ...this.chartModel, ...updates };
					this._modelVersion.update((v) => v + 1);
				}
			}
		} finally {
			this.testing.set(false);
		}

		this.angulartics2.eventTrack.next({
			action: 'Charts: test query executed',
		});
		posthog.capture('Charts: test query executed');
	}

	async saveQuery(): Promise<void> {
		if (!this.queryName().trim() || !this.queryText().trim()) {
			return;
		}

		this.saving.set(true);

		const widgetOptions = this.currentWidgetOptions();

		const payload = {
			name: this.queryName(),
			description: this.queryDescription() || undefined,
			query_text: this.queryText(),
			widget_type: 'chart' as const,
			chart_type: this.chartModel.chartType as ChartType,
			widget_options: widgetOptions as unknown as Record<string, unknown>,
		};

		try {
			if (this.isEditMode()) {
				const result = await this._savedQueries.updateSavedQuery(this.connectionId(), this.queryId(), payload);
				if (result) this.router.navigate(['/panels', this.connectionId()]);
				this.angulartics2.eventTrack.next({
					action: 'Charts: saved query updated',
				});
				posthog.capture('Charts: saved query updated');
			} else {
				const result = await this._savedQueries.createSavedQuery(this.connectionId(), payload);
				if (result) this.router.navigate(['/panels', this.connectionId()]);
				this.angulartics2.eventTrack.next({
					action: 'Charts: saved query created',
				});
				posthog.capture('Charts: saved query created');
			}
		} finally {
			this.saving.set(false);
		}
	}

	async generateWithAi(): Promise<void> {
		if (!this.aiDescription().trim()) return;

		this.aiGenerating.set(true);

		try {
			const result = await this._dashboards.generateWidgetWithAi(this.connectionId(), {
				chart_description: this.aiDescription(),
			});

			if (result) {
				this._applyAiResponse(result);
				this.aiExpanded.set(false);
				this.manualExpanded.set(true);
				await this.testQuery();
			}
		} finally {
			this.aiGenerating.set(false);
		}

		this.angulartics2.eventTrack.next({
			action: 'Charts: AI generation used',
		});
		posthog.capture('Charts: AI generation used');
	}

	private _applyAiResponse(result: GeneratedPanelWithPosition): void {
		const newModel: ChartOptionsModel = { ...this.chartModel };

		if (result.name) this.queryName.set(result.name);
		if (result.description) this.queryDescription.set(result.description);
		if (result.query_text) {
			this.queryText.set(result.query_text);
			this.codeModel.set({ language: 'sql', uri: 'query.sql', value: result.query_text });
		}

		if (result.chart_type) {
			const validTypes: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'polarArea'];
			if (validTypes.includes(result.chart_type as ChartType)) {
				newModel.chartType = result.chart_type;
			}
		}

		if (result.widget_options) {
			const opts = result.widget_options as Partial<ChartWidgetOptions>;
			this._applyWidgetOptionsToModel(opts, newModel);
		}

		this.chartModel = newModel;
		this._modelVersion.update((v) => v + 1);
	}

	private _applyWidgetOptionsToModel(opts: Partial<ChartWidgetOptions>, model: ChartOptionsModel): void {
		if (opts.label_column) model.labelColumn = opts.label_column;
		if (opts.label_type) model.labelType = opts.label_type;

		// Series
		if (opts.series_column) {
			model.seriesMode = 'column';
			model.seriesColumn = opts.series_column;
			if (opts.value_column) model.seriesValueColumn = opts.value_column;
		} else if (opts.series?.length) {
			model.seriesMode = 'manual';
			model.seriesList = [...opts.series];
		} else if (opts.value_column) {
			model.seriesMode = 'manual';
			model.seriesList = [{ value_column: opts.value_column }];
		}

		// Display options
		if (opts.stacked) model.stacked = true;
		if (opts.horizontal) model.horizontal = true;
		if (opts.show_data_labels) model.showDataLabels = true;

		// Legend
		if (opts.legend) {
			if (opts.legend.show !== undefined) model.legendShow = opts.legend.show;
			if (opts.legend.position) model.legendPosition = opts.legend.position;
		}

		// Units
		if (opts.units) {
			if (opts.units.convert_unit) {
				model.unitMode = 'convert';
				model.convertUnit = opts.units.convert_unit;
			} else if (opts.units.text) {
				model.unitMode = 'custom';
				model.unitsText = opts.units.text;
				if (opts.units.position) model.unitsPosition = opts.units.position;
			}
		}

		// Number format
		if (opts.number_format) {
			if (opts.number_format.decimal_places !== undefined) {
				model.decimalPlaces = opts.number_format.decimal_places;
			}
			if (opts.number_format.thousands_separator !== undefined) {
				model.thousandsSeparator = opts.number_format.thousands_separator;
			}
			if (opts.number_format.compact) model.compact = true;
		}

		// Y-axis
		if (opts.y_axis) {
			if (opts.y_axis.title) model.yAxisTitle = opts.y_axis.title;
			if (opts.y_axis.min !== undefined) model.yAxisMin = opts.y_axis.min;
			if (opts.y_axis.max !== undefined) model.yAxisMax = opts.y_axis.max;
			if (opts.y_axis.begin_at_zero !== undefined) model.yAxisBeginAtZero = opts.y_axis.begin_at_zero;
			if (opts.y_axis.scale_type) model.yAxisScaleType = opts.y_axis.scale_type;
		}

		// X-axis
		if (opts.x_axis) {
			if (opts.x_axis.title) model.xAxisTitle = opts.x_axis.title;
		}

		// Sort & limit
		if (opts.sort_by) model.sortBy = opts.sort_by;
		if (opts.limit) model.limit = opts.limit;

		// Color palette
		if (opts.color_palette?.length) {
			model.colorPalette = [...opts.color_palette];
		}
	}

	private _loadAiPrerequisites(): void {
		const connectionId = this.connectionId();
		if (!connectionId) return;
		this._dashboards.setActiveConnection(connectionId);
	}
}
