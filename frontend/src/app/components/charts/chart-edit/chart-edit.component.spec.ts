import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { ChartType, SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { ChartEditComponent } from './chart-edit.component';

type ChartEditComponentTestable = ChartEditComponent & {
	isEditMode: WritableSignal<boolean>;
	queryName: WritableSignal<string>;
	queryText: WritableSignal<string>;
	queryDescription: WritableSignal<string>;
	saving: WritableSignal<boolean>;
	testing: WritableSignal<boolean>;
	testResults: WritableSignal<Record<string, unknown>[]>;
	resultColumns: WritableSignal<string[]>;
	executionTime: WritableSignal<number | null>;
	labelColumn: WritableSignal<string>;
	valueColumn: WritableSignal<string>;
	chartType: WritableSignal<ChartType>;
	canSave: Signal<boolean>;
	canTest: Signal<boolean>;
	hasChartData: Signal<boolean>;
};

describe('ChartEditComponent', () => {
	let component: ChartEditComponent;
	let fixture: ComponentFixture<ChartEditComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;
	let mockConnectionsService: Partial<ConnectionsService>;
	let mockUiSettingsService: Partial<UiSettingsService>;
	let router: Router;

	const mockSavedQuery: SavedQuery = {
		id: '1',
		name: 'Test Query',
		description: 'Test description',
		widget_type: 'chart',
		chart_type: 'bar',
		widget_options: { label_column: 'name', value_column: 'count' },
		query_text: 'SELECT * FROM users',
		connection_id: 'conn-1',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	};

	beforeEach(async () => {
		mockSavedQueriesService = {
			fetchSavedQuery: vi.fn().mockReturnValue(of(mockSavedQuery)),
			createSavedQuery: vi.fn().mockReturnValue(of(mockSavedQuery)),
			updateSavedQuery: vi.fn().mockReturnValue(of(mockSavedQuery)),
			testQuery: vi.fn().mockReturnValue(
				of({
					data: [{ name: 'John', count: 10 }],
					execution_time_ms: 50,
				}),
			),
		};

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		};

		mockUiSettingsService = {
			editorTheme: 'vs-dark',
			getUiSettings: vi.fn().mockReturnValue(of({})),
		};

		await TestBed.configureTestingModule({
			imports: [
				ChartEditComponent,
				BrowserAnimationsModule,
				MatSnackBarModule,
				RouterTestingModule,
				Angulartics2Module.forRoot(),
			],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
				{ provide: ConnectionsService, useValue: mockConnectionsService },
				{ provide: UiSettingsService, useValue: mockUiSettingsService },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: {
								get: (key: string) => {
									if (key === 'connection-id') return 'conn-1';
									if (key === 'query-id') return null;
									return null;
								},
							},
						},
					},
				},
			],
		})
			.overrideComponent(ChartEditComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();

		router = TestBed.inject(Router);
		vi.spyOn(router, 'navigate');

		fixture = TestBed.createComponent(ChartEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize in create mode when no query-id', () => {
		const testable = component as ChartEditComponentTestable;
		expect(testable.isEditMode()).toBe(false);
	});

	it('should set page title on init', () => {
		expect(mockConnectionsService.getCurrentConnectionTitle).toHaveBeenCalled();
	});

	it('should have correct default chart type', () => {
		const testable = component as ChartEditComponentTestable;
		expect(testable.chartType()).toBe('bar');
	});

	describe('canSave computed', () => {
		it('should return false when name is empty', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryName.set('');
			testable.queryText.set('SELECT 1');
			expect(testable.canSave()).toBe(false);
		});

		it('should return false when query is empty', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryName.set('Test');
			testable.queryText.set('');
			expect(testable.canSave()).toBe(false);
		});

		it('should return true when name and query are provided', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryName.set('Test');
			testable.queryText.set('SELECT 1');
			testable.saving.set(false);
			expect(testable.canSave()).toBe(true);
		});

		it('should return false when saving', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryName.set('Test');
			testable.queryText.set('SELECT 1');
			testable.saving.set(true);
			expect(testable.canSave()).toBe(false);
		});
	});

	describe('canTest computed', () => {
		it('should return false when query is empty', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('');
			expect(testable.canTest()).toBe(false);
		});

		it('should return true when query is provided', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('SELECT 1');
			testable.testing.set(false);
			expect(testable.canTest()).toBe(true);
		});

		it('should return false when testing', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('SELECT 1');
			testable.testing.set(true);
			expect(testable.canTest()).toBe(false);
		});
	});

	describe('testQuery', () => {
		it('should call testQuery service method', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('SELECT * FROM users');
			component.testQuery();
			expect(mockSavedQueriesService.testQuery).toHaveBeenCalledWith('conn-1', {
				query_text: 'SELECT * FROM users',
			});
		});

		it('should set results and columns after successful test', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('SELECT * FROM users');
			component.testQuery();
			expect(testable.testResults()).toEqual([{ name: 'John', count: 10 }]);
			expect(testable.resultColumns()).toEqual(['name', 'count']);
			expect(testable.executionTime()).toBe(50);
		});

		it('should auto-select label and value columns', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryText.set('SELECT * FROM users');
			component.testQuery();
			expect(testable.labelColumn()).toBe('name');
			expect(testable.valueColumn()).toBe('count');
		});
	});

	describe('saveQuery', () => {
		it('should call createSavedQuery in create mode', () => {
			const testable = component as ChartEditComponentTestable;
			testable.isEditMode.set(false);
			testable.queryName.set('New Query');
			testable.queryText.set('SELECT 1');
			component.saveQuery();
			expect(mockSavedQueriesService.createSavedQuery).toHaveBeenCalledWith('conn-1', {
				name: 'New Query',
				description: undefined,
				query_text: 'SELECT 1',
				widget_type: 'chart',
				chart_type: 'bar',
				widget_options: { label_type: 'values' },
			});
		});

		it('should navigate to charts list after save', () => {
			const testable = component as ChartEditComponentTestable;
			testable.queryName.set('New Query');
			testable.queryText.set('SELECT 1');
			component.saveQuery();
			expect(router.navigate).toHaveBeenCalledWith(['/charts', 'conn-1']);
		});
	});

	describe('onCodeChange', () => {
		it('should update queryText', () => {
			const testable = component as ChartEditComponentTestable;
			component.onCodeChange('SELECT * FROM table');
			expect(testable.queryText()).toBe('SELECT * FROM table');
		});
	});

	describe('hasChartData computed', () => {
		it('should return false when no results', () => {
			const testable = component as ChartEditComponentTestable;
			testable.testResults.set([]);
			expect(testable.hasChartData()).toBe(false);
		});

		it('should return false when no columns selected', () => {
			const testable = component as ChartEditComponentTestable;
			testable.testResults.set([{ name: 'John' }]);
			testable.labelColumn.set('');
			testable.valueColumn.set('');
			expect(testable.hasChartData()).toBe(false);
		});

		it('should return true when results and columns are set', () => {
			const testable = component as ChartEditComponentTestable;
			testable.testResults.set([{ name: 'John', count: 10 }]);
			testable.labelColumn.set('name');
			testable.valueColumn.set('count');
			expect(testable.hasChartData()).toBe(true);
		});
	});
});
