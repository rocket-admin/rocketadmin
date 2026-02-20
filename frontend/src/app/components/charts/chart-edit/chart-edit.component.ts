import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { finalize } from 'rxjs/operators';
import { DEFAULT_COLOR_PALETTE } from 'src/app/lib/chart-config.helper';
import {
	ChartAxisConfig,
	ChartLegendConfig,
	ChartNumberFormatConfig,
	ChartSeriesConfig,
	ChartType,
	ChartUnitConfig,
	ChartWidgetOptions,
	TestQueryResult,
} from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
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
		RouterModule,
		MatButtonModule,
		MatCheckboxModule,
		MatExpansionModule,
		MatIconModule,
		MatInputModule,
		MatFormFieldModule,
		MatSelectModule,
		MatTableModule,
		MatTooltipModule,
		MatProgressSpinnerModule,
		CodeEditorModule,
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

	// Basic chart config
	protected chartType = signal<ChartType>('bar');
	protected labelColumn = signal('');
	protected labelType = signal<'values' | 'datetime'>('values');

	// Series config
	protected seriesMode = signal<'manual' | 'column'>('manual');
	protected seriesList = signal<ChartSeriesConfig[]>([]);
	protected seriesColumn = signal('');
	protected seriesValueColumn = signal('');

	// Display options
	protected stacked = signal(false);
	protected horizontal = signal(false);
	protected showDataLabels = signal(false);

	// Legend
	protected legendShow = signal(true);
	protected legendPosition = signal<'top' | 'bottom' | 'left' | 'right'>('top');

	// Units
	protected unitMode = signal<'none' | 'custom' | 'convert'>('none');
	protected unitsText = signal('');
	protected unitsPosition = signal<'prefix' | 'suffix'>('suffix');
	protected convertUnit = signal('');

	// Number format
	protected decimalPlaces = signal<number | null>(null);
	protected thousandsSeparator = signal(true);
	protected compact = signal(false);

	// Y-axis
	protected yAxisTitle = signal('');
	protected yAxisMin = signal<number | null>(null);
	protected yAxisMax = signal<number | null>(null);
	protected yAxisBeginAtZero = signal(true);
	protected yAxisScaleType = signal<'linear' | 'logarithmic'>('linear');

	// X-axis
	protected xAxisTitle = signal('');

	// Sort & limit
	protected sortBy = signal<'label_asc' | 'label_desc' | 'value_asc' | 'value_desc' | 'none'>('none');
	protected limit = signal<number | null>(null);

	// Color palette
	protected colorPalette = signal<string[]>([]);

	public chartTypes: { value: ChartType; label: string }[] = [
		{ value: 'bar', label: 'Bar Chart' },
		{ value: 'line', label: 'Line Chart' },
		{ value: 'pie', label: 'Pie Chart' },
		{ value: 'doughnut', label: 'Doughnut Chart' },
		{ value: 'polarArea', label: 'Polar Area Chart' },
	];

	public labelTypes: { value: 'values' | 'datetime'; label: string }[] = [
		{ value: 'values', label: 'Values' },
		{ value: 'datetime', label: 'Datetime' },
	];

	public legendPositions: { value: string; label: string }[] = [
		{ value: 'top', label: 'Top' },
		{ value: 'bottom', label: 'Bottom' },
		{ value: 'left', label: 'Left' },
		{ value: 'right', label: 'Right' },
	];

	public sortOptions: { value: string; label: string }[] = [
		{ value: 'none', label: 'None' },
		{ value: 'label_asc', label: 'Label (A-Z)' },
		{ value: 'label_desc', label: 'Label (Z-A)' },
		{ value: 'value_asc', label: 'Value (Low-High)' },
		{ value: 'value_desc', label: 'Value (High-Low)' },
	];

	public scaleTypes: { value: string; label: string }[] = [
		{ value: 'linear', label: 'Linear' },
		{ value: 'logarithmic', label: 'Logarithmic' },
	];

	public pointStyles: { value: string; label: string }[] = [
		{ value: 'circle', label: 'Circle' },
		{ value: 'rect', label: 'Rectangle' },
		{ value: 'triangle', label: 'Triangle' },
		{ value: 'cross', label: 'Cross' },
		{ value: 'none', label: 'None' },
	];

	public unitModes: { value: string; label: string }[] = [
		{ value: 'none', label: 'None' },
		{ value: 'custom', label: 'Custom text' },
		{ value: 'convert', label: 'Auto-convert' },
	];

	public convertUnitPresets: { group: string; units: { value: string; label: string }[] }[] = [
		{
			group: 'Time',
			units: [
				{ value: 'ms', label: 'Milliseconds (ms)' },
				{ value: 's', label: 'Seconds (s)' },
				{ value: 'min', label: 'Minutes (min)' },
				{ value: 'h', label: 'Hours (h)' },
				{ value: 'd', label: 'Days (d)' },
			],
		},
		{
			group: 'Data',
			units: [
				{ value: 'B', label: 'Bytes (B)' },
				{ value: 'KB', label: 'Kilobytes (KB)' },
				{ value: 'MB', label: 'Megabytes (MB)' },
				{ value: 'GB', label: 'Gigabytes (GB)' },
				{ value: 'TB', label: 'Terabytes (TB)' },
			],
		},
		{
			group: 'Length',
			units: [
				{ value: 'mm', label: 'Millimeters (mm)' },
				{ value: 'cm', label: 'Centimeters (cm)' },
				{ value: 'm', label: 'Meters (m)' },
				{ value: 'km', label: 'Kilometers (km)' },
				{ value: 'in', label: 'Inches (in)' },
				{ value: 'ft', label: 'Feet (ft)' },
				{ value: 'mi', label: 'Miles (mi)' },
			],
		},
		{
			group: 'Mass',
			units: [
				{ value: 'mg', label: 'Milligrams (mg)' },
				{ value: 'g', label: 'Grams (g)' },
				{ value: 'kg', label: 'Kilograms (kg)' },
				{ value: 'oz', label: 'Ounces (oz)' },
				{ value: 'lb', label: 'Pounds (lb)' },
			],
		},
		{
			group: 'Temperature',
			units: [
				{ value: 'C', label: 'Celsius (C)' },
				{ value: 'F', label: 'Fahrenheit (F)' },
				{ value: 'K', label: 'Kelvin (K)' },
			],
		},
		{
			group: 'Frequency',
			units: [
				{ value: 'Hz', label: 'Hertz (Hz)' },
				{ value: 'kHz', label: 'Kilohertz (kHz)' },
				{ value: 'MHz', label: 'Megahertz (MHz)' },
				{ value: 'GHz', label: 'Gigahertz (GHz)' },
			],
		},
		{
			group: 'Power',
			units: [
				{ value: 'W', label: 'Watts (W)' },
				{ value: 'kW', label: 'Kilowatts (kW)' },
				{ value: 'MW', label: 'Megawatts (MW)' },
			],
		},
		{
			group: 'Energy',
			units: [
				{ value: 'J', label: 'Joules (J)' },
				{ value: 'Wh', label: 'Watt-hours (Wh)' },
				{ value: 'kWh', label: 'Kilowatt-hours (kWh)' },
			],
		},
		{
			group: 'Pressure',
			units: [
				{ value: 'Pa', label: 'Pascals (Pa)' },
				{ value: 'bar', label: 'Bar' },
				{ value: 'psi', label: 'PSI' },
				{ value: 'atm', label: 'Atmospheres (atm)' },
			],
		},
		{
			group: 'Volume',
			units: [
				{ value: 'mL', label: 'Milliliters (mL)' },
				{ value: 'L', label: 'Liters (L)' },
				{ value: 'gal', label: 'Gallons (gal)' },
			],
		},
	];

	protected showLabelTypeOption = computed(() => ['bar', 'line'].includes(this.chartType()));
	protected isPieType = computed(() => ['pie', 'doughnut', 'polarArea'].includes(this.chartType()));

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
		const hasLabel = !!this.labelColumn();
		if (this.seriesMode() === 'column') {
			return this.testResults().length > 0 && hasLabel && !!this.seriesColumn() && !!this.seriesValueColumn();
		}
		const hasSeries = this.seriesList().length > 0 && this.seriesList().some((s) => !!s.value_column);
		return this.testResults().length > 0 && hasLabel && hasSeries;
	});

	protected currentWidgetOptions = computed<ChartWidgetOptions>(() => {
		const options: ChartWidgetOptions = {
			label_column: this.labelColumn(),
			label_type: this.labelType(),
		};

		if (this.seriesMode() === 'column' && this.seriesColumn()) {
			options.series_column = this.seriesColumn();
			options.value_column = this.seriesValueColumn();
		} else {
			const series = this.seriesList();
			if (series.length > 0) {
				options.series = series;
			}
		}

		if (this.stacked()) options.stacked = true;
		if (this.horizontal()) options.horizontal = true;
		if (this.showDataLabels()) options.show_data_labels = true;

		if (!this.legendShow() || this.legendPosition() !== 'top') {
			options.legend = {
				show: this.legendShow(),
				position: this.legendPosition(),
			};
		}

		if (this.unitMode() === 'custom' && this.unitsText()) {
			options.units = { text: this.unitsText(), position: this.unitsPosition() };
		} else if (this.unitMode() === 'convert' && this.convertUnit()) {
			options.units = { convert_unit: this.convertUnit() };
		}

		const numberFormat: ChartNumberFormatConfig = {};
		if (this.decimalPlaces() !== null) numberFormat.decimal_places = this.decimalPlaces()!;
		if (!this.thousandsSeparator()) numberFormat.thousands_separator = false;
		if (this.compact()) numberFormat.compact = true;
		if (Object.keys(numberFormat).length > 0) options.number_format = numberFormat;

		const yAxis: ChartAxisConfig = {};
		if (this.yAxisTitle()) yAxis.title = this.yAxisTitle();
		if (this.yAxisMin() !== null) yAxis.min = this.yAxisMin()!;
		if (this.yAxisMax() !== null) yAxis.max = this.yAxisMax()!;
		if (!this.yAxisBeginAtZero()) yAxis.begin_at_zero = false;
		if (this.yAxisScaleType() !== 'linear') yAxis.scale_type = this.yAxisScaleType();
		if (Object.keys(yAxis).length > 0) options.y_axis = yAxis;

		const xAxis: ChartAxisConfig = {};
		if (this.xAxisTitle()) xAxis.title = this.xAxisTitle();
		if (Object.keys(xAxis).length > 0) options.x_axis = xAxis;

		if (this.sortBy() !== 'none') options.sort_by = this.sortBy();
		if (this.limit() !== null && this.limit()! > 0) options.limit = this.limit()!;

		const palette = this.colorPalette();
		if (palette.length > 0) options.color_palette = palette;

		return options;
	});

	private _savedQueries = inject(SavedQueriesService);
	private _connections = inject(ConnectionsService);
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

		this.codeEditorTheme = this._uiSettings.editorTheme;

		if (this.isEditMode()) {
			this.loadSavedQuery();
		} else {
			this.loading.set(false);
		}
	}

	loadSavedQuery(): void {
		this.loading.set(true);
		this._savedQueries
			.fetchSavedQuery(this.connectionId(), this.queryId())
			.pipe(finalize(() => this.loading.set(false)))
			.subscribe((query) => {
				if (query) {
					this.queryName.set(query.name);
					this.queryDescription.set(query.description || '');
					this.queryText.set(query.query_text);

					if (query.chart_type) {
						this.chartType.set(query.chart_type);
					}

					if (query.widget_options) {
						const opts = query.widget_options as Partial<ChartWidgetOptions>;

						if (opts.label_column) this.labelColumn.set(opts.label_column);
						if (opts.label_type) this.labelType.set(opts.label_type);

						// Load series
						if (opts.series_column) {
							this.seriesMode.set('column');
							this.seriesColumn.set(opts.series_column);
							if (opts.value_column) this.seriesValueColumn.set(opts.value_column);
						} else if (opts.series?.length) {
							this.seriesList.set([...opts.series]);
						} else if (opts.value_column) {
							// Legacy: convert single value_column to series
							this.seriesList.set([{ value_column: opts.value_column }]);
						}

						// Display options
						if (opts.stacked) this.stacked.set(true);
						if (opts.horizontal) this.horizontal.set(true);
						if (opts.show_data_labels) this.showDataLabels.set(true);

						// Legend
						if (opts.legend) {
							if (opts.legend.show !== undefined) this.legendShow.set(opts.legend.show);
							if (opts.legend.position) this.legendPosition.set(opts.legend.position);
						}

						// Units
						if (opts.units) {
							if (opts.units.convert_unit) {
								this.unitMode.set('convert');
								this.convertUnit.set(opts.units.convert_unit);
							} else if (opts.units.text) {
								this.unitMode.set('custom');
								this.unitsText.set(opts.units.text);
								if (opts.units.position) this.unitsPosition.set(opts.units.position);
							}
						}

						// Number format
						if (opts.number_format) {
							if (opts.number_format.decimal_places !== undefined) {
								this.decimalPlaces.set(opts.number_format.decimal_places);
							}
							if (opts.number_format.thousands_separator !== undefined) {
								this.thousandsSeparator.set(opts.number_format.thousands_separator);
							}
							if (opts.number_format.compact) this.compact.set(true);
						}

						// Y-axis
						if (opts.y_axis) {
							if (opts.y_axis.title) this.yAxisTitle.set(opts.y_axis.title);
							if (opts.y_axis.min !== undefined) this.yAxisMin.set(opts.y_axis.min);
							if (opts.y_axis.max !== undefined) this.yAxisMax.set(opts.y_axis.max);
							if (opts.y_axis.begin_at_zero !== undefined) this.yAxisBeginAtZero.set(opts.y_axis.begin_at_zero);
							if (opts.y_axis.scale_type) this.yAxisScaleType.set(opts.y_axis.scale_type);
						}

						// X-axis
						if (opts.x_axis) {
							if (opts.x_axis.title) this.xAxisTitle.set(opts.x_axis.title);
						}

						// Sort & limit
						if (opts.sort_by) this.sortBy.set(opts.sort_by);
						if (opts.limit) this.limit.set(opts.limit);

						// Color palette
						if (opts.color_palette?.length) {
							this.colorPalette.set([...opts.color_palette]);
						}
					}

					this.codeModel.set({ language: 'sql', uri: 'query.sql', value: query.query_text });
					this.testQuery();
				}
			});
	}

	onCodeChange(value: string): void {
		this.queryText.set(value);
	}

	testQuery(): void {
		if (!this.queryText().trim()) {
			return;
		}

		this.testing.set(true);
		this.showResults.set(false);
		this._savedQueries
			.testQuery(this.connectionId(), { query_text: this.queryText() })
			.pipe(finalize(() => this.testing.set(false)))
			.subscribe((result: TestQueryResult) => {
				if (result) {
					this.testResults.set(result.data);
					this.executionTime.set(result.execution_time_ms);
					this.resultColumns.set(result.data.length > 0 ? Object.keys(result.data[0]) : []);
					this.showResults.set(true);

					if (this.resultColumns().length > 0 && !this.labelColumn()) {
						this.labelColumn.set(this.resultColumns()[0]);
					}
					// Auto-add first series if none exist
					if (this.seriesList().length === 0 && this.resultColumns().length > 1) {
						this.seriesList.set([{ value_column: this.resultColumns()[1] }]);
					}
				}
			});

		this.angulartics2.eventTrack.next({
			action: 'Charts: test query executed',
		});
		posthog.capture('Charts: test query executed');
	}

	addSeries(): void {
		const cols = this.resultColumns();
		const usedCols = new Set(this.seriesList().map((s) => s.value_column));
		const nextCol = cols.find((c) => c !== this.labelColumn() && !usedCols.has(c)) || cols[0] || '';
		this.seriesList.update((list) => [...list, { value_column: nextCol }]);
	}

	removeSeries(index: number): void {
		this.seriesList.update((list) => list.filter((_, i) => i !== index));
	}

	updateSeries(index: number, field: keyof ChartSeriesConfig, value: unknown): void {
		this.seriesList.update((list) => {
			const updated = [...list];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	}

	toHex(color: string | undefined): string {
		if (!color) return '#6366f1';
		if (color.startsWith('#')) return color.substring(0, 7);
		const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (!match) return '#000000';
		const r = parseInt(match[1]).toString(16).padStart(2, '0');
		const g = parseInt(match[2]).toString(16).padStart(2, '0');
		const b = parseInt(match[3]).toString(16).padStart(2, '0');
		return `#${r}${g}${b}`;
	}

	addPaletteColor(): void {
		this.colorPalette.update((list) => [...list, '#6366f1']);
	}

	removePaletteColor(index: number): void {
		this.colorPalette.update((list) => list.filter((_, i) => i !== index));
	}

	updatePaletteColor(index: number, value: string): void {
		this.colorPalette.update((list) => {
			const updated = [...list];
			updated[index] = value;
			return updated;
		});
	}

	initializeDefaultPalette(): void {
		this.colorPalette.set([...DEFAULT_COLOR_PALETTE]);
	}

	saveQuery(): void {
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
			chart_type: this.chartType(),
			widget_options: widgetOptions as unknown as Record<string, unknown>,
		};

		if (this.isEditMode()) {
			this._savedQueries
				.updateSavedQuery(this.connectionId(), this.queryId(), payload)
				.pipe(finalize(() => this.saving.set(false)))
				.subscribe(() => {
					this.router.navigate(['/panels', this.connectionId()]);
				});
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query updated',
			});
			posthog.capture('Charts: saved query updated');
		} else {
			this._savedQueries
				.createSavedQuery(this.connectionId(), payload)
				.pipe(finalize(() => this.saving.set(false)))
				.subscribe(() => {
					this.router.navigate(['/panels', this.connectionId()]);
				});
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query created',
			});
			posthog.capture('Charts: saved query created');
		}
	}
}
