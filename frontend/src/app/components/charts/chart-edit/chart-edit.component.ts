import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
import { ChartType, TestQueryResult } from 'src/app/models/saved-query';
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

	protected chartType = signal<ChartType>('bar');
	protected labelColumn = signal('');
	protected valueColumn = signal('');
	protected labelType = signal<'values' | 'datetime'>('values');

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

	protected showLabelTypeOption = computed(() => ['bar', 'line'].includes(this.chartType()));

	// Use a signal for codeModel to ensure change detection works on load
	// Only update this signal when loading a query, not during typing (to preserve cursor position)
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

	protected hasChartData = computed(
		() => this.testResults().length > 0 && !!this.labelColumn() && !!this.valueColumn(),
	);

	private _savedQueries = inject(SavedQueriesService);
	private _connections = inject(ConnectionsService);
	private _uiSettings = inject(UiSettingsService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private angulartics2 = inject(Angulartics2);
	private title = inject(Title);

	private connectionTitle = toSignal(this._connections.getCurrentConnectionTitle(), { initialValue: '' });

	constructor() {
		// Page title effect
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
					// Load chart configuration
					if (query.chart_type) {
						this.chartType.set(query.chart_type);
					}
					if (query.widget_options) {
						if (query.widget_options['label_column']) {
							this.labelColumn.set(query.widget_options['label_column'] as string);
						}
						if (query.widget_options['value_column']) {
							this.valueColumn.set(query.widget_options['value_column'] as string);
						}
						if (query.widget_options['label_type']) {
							this.labelType.set(query.widget_options['label_type'] as 'values' | 'datetime');
						}
					}
					// Set codeModel value for Monaco editor (only on load, not during typing)
					this.codeModel.set({ language: 'sql', uri: 'query.sql', value: query.query_text });
					// Automatically test the query to show chart preview
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
					if (this.resultColumns().length > 1 && !this.valueColumn()) {
						this.valueColumn.set(this.resultColumns()[1]);
					}
				}
			});

		this.angulartics2.eventTrack.next({
			action: 'Charts: test query executed',
		});
		posthog.capture('Charts: test query executed');
	}

	saveQuery(): void {
		if (!this.queryName().trim() || !this.queryText().trim()) {
			return;
		}

		this.saving.set(true);

		// Build widget_options with column selections
		const widgetOptions: Record<string, unknown> = {};
		if (this.labelColumn()) {
			widgetOptions['label_column'] = this.labelColumn();
		}
		if (this.valueColumn()) {
			widgetOptions['value_column'] = this.valueColumn();
		}
		if (this.labelType() && this.showLabelTypeOption()) {
			widgetOptions['label_type'] = this.labelType();
		}

		const payload = {
			name: this.queryName(),
			description: this.queryDescription() || undefined,
			query_text: this.queryText(),
			widget_type: 'chart' as const,
			chart_type: this.chartType(),
			widget_options: Object.keys(widgetOptions).length > 0 ? widgetOptions : undefined,
		};

		if (this.isEditMode()) {
			this._savedQueries
				.updateSavedQuery(this.connectionId(), this.queryId(), payload)
				.pipe(finalize(() => this.saving.set(false)))
				.subscribe(() => {
					this.router.navigate(['/charts', this.connectionId()]);
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
					this.router.navigate(['/charts', this.connectionId()]);
				});
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query created',
			});
			posthog.capture('Charts: saved query created');
		}
	}

	cancel(): void {
		this.router.navigate(['/charts', this.connectionId()]);
	}
}
