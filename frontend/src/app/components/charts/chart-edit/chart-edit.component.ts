import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ChartType, SavedQuery, TestQueryResult } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
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
	],
})
export class ChartEditComponent implements OnInit, OnDestroy {
	public connectionId: string;
	public queryId: string;
	public isEditMode = false;
	public loading = true;
	public saving = false;
	public testing = false;

	public queryName = '';
	public queryDescription = '';
	public queryText = '';

	public testResults: Record<string, unknown>[] = [];
	public resultColumns: string[] = [];
	public executionTime: number | null = null;
	public showResults = false;

	public chartType: ChartType = 'bar';
	public labelColumn = '';
	public valueColumn = '';
	public chartTypes: { value: ChartType; label: string }[] = [
		{ value: 'bar', label: 'Bar Chart' },
		{ value: 'line', label: 'Line Chart' },
		{ value: 'pie', label: 'Pie Chart' },
		{ value: 'doughnut', label: 'Doughnut Chart' },
		{ value: 'polarArea', label: 'Polar Area Chart' },
	];

	public codeModel: { language: string; uri: string; value: string };
	public codeEditorOptions = {
		minimap: { enabled: false },
		automaticLayout: true,
		scrollBeyondLastLine: false,
		wordWrap: 'on' as const,
		lineNumbers: 'on' as const,
	};
	public codeEditorTheme = 'vs-dark';

	private subscriptions: Subscription[] = [];

	constructor(
		private _savedQueries: SavedQueriesService,
		private _connections: ConnectionsService,
		private _uiSettings: UiSettingsService,
		private route: ActivatedRoute,
		private router: Router,
		private angulartics2: Angulartics2,
		private title: Title,
	) {}

	ngOnInit(): void {
		this.connectionId = this.route.snapshot.paramMap.get('connection-id');
		this.queryId = this.route.snapshot.paramMap.get('query-id');
		this.isEditMode = !!this.queryId;

		this.codeEditorTheme = this._uiSettings.editorTheme;

		this._connections.getCurrentConnectionTitle().subscribe((connectionTitle) => {
			const pageTitle = this.isEditMode ? 'Edit Query' : 'Create Query';
			this.title.setTitle(`${pageTitle} | ${connectionTitle || 'Rocketadmin'}`);
		});

		this.initCodeModel();

		if (this.isEditMode) {
			this.loadSavedQuery();
		} else {
			this.loading = false;
		}
	}

	ngOnDestroy(): void {
		this.subscriptions.forEach((sub) => sub.unsubscribe());
	}

	initCodeModel(): void {
		this.codeModel = {
			language: 'sql',
			uri: 'query.sql',
			value: this.queryText,
		};
	}

	loadSavedQuery(): void {
		this.loading = true;
		this._savedQueries
			.fetchSavedQuery(this.connectionId, this.queryId)
			.pipe(finalize(() => (this.loading = false)))
			.subscribe((query) => {
				if (query) {
					this.queryName = query.name;
					this.queryDescription = query.description || '';
					this.queryText = query.query_text;
					this.codeModel = {
						language: 'sql',
						uri: 'query.sql',
						value: this.queryText,
					};
				}
			});
	}

	onCodeChange(value: string): void {
		this.queryText = value;
	}

	testQuery(): void {
		if (!this.queryText.trim()) {
			return;
		}

		this.testing = true;
		this.showResults = false;
		this._savedQueries
			.testQuery(this.connectionId, { query_text: this.queryText })
			.pipe(finalize(() => (this.testing = false)))
			.subscribe((result: TestQueryResult) => {
				if (result) {
					this.testResults = result.data;
					this.executionTime = result.execution_time_ms;
					this.resultColumns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
					this.showResults = true;

					if (this.resultColumns.length > 0 && !this.labelColumn) {
						this.labelColumn = this.resultColumns[0];
					}
					if (this.resultColumns.length > 1 && !this.valueColumn) {
						this.valueColumn = this.resultColumns[1];
					}
				}
			});

		this.angulartics2.eventTrack.next({
			action: 'Charts: test query executed',
		});
	}

	saveQuery(): void {
		if (!this.queryName.trim() || !this.queryText.trim()) {
			return;
		}

		this.saving = true;

		const payload = {
			name: this.queryName,
			description: this.queryDescription || undefined,
			query_text: this.queryText,
		};

		if (this.isEditMode) {
			this._savedQueries
				.updateSavedQuery(this.connectionId, this.queryId, payload)
				.pipe(finalize(() => (this.saving = false)))
				.subscribe(() => {
					this.router.navigate(['/charts', this.connectionId]);
				});
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query updated',
			});
		} else {
			this._savedQueries
				.createSavedQuery(this.connectionId, payload)
				.pipe(finalize(() => (this.saving = false)))
				.subscribe(() => {
					this.router.navigate(['/charts', this.connectionId]);
				});
			this.angulartics2.eventTrack.next({
				action: 'Charts: saved query created',
			});
		}
	}

	cancel(): void {
		this.router.navigate(['/charts', this.connectionId]);
	}

	get canSave(): boolean {
		return !!this.queryName.trim() && !!this.queryText.trim() && !this.saving;
	}

	get canTest(): boolean {
		return !!this.queryText.trim() && !this.testing;
	}

	get hasChartData(): boolean {
		return this.testResults.length > 0 && !!this.labelColumn && !!this.valueColumn;
	}
}
