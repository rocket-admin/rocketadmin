import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { UiSettingsService } from 'src/app/services/ui-settings.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { ChartEditComponent } from './chart-edit.component';

describe('ChartEditComponent', () => {
	let component: ChartEditComponent;
	let fixture: ComponentFixture<ChartEditComponent>;
	let mockSavedQueriesService: any;
	let mockConnectionsService: any;
	let mockUiSettingsService: any;
	let router: Router;

	const mockSavedQuery: SavedQuery = {
		id: '1',
		name: 'Test Query',
		description: 'Test description',
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
		} as any;

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		} as any;

		mockUiSettingsService = {
			editorTheme: 'vs-dark',
		} as any;

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
		expect(component.isEditMode).toBe(false);
	});

	it('should set page title on init', () => {
		expect(mockConnectionsService.getCurrentConnectionTitle).toHaveBeenCalled();
	});

	it('should have correct default chart type', () => {
		expect(component.chartType).toBe('bar');
	});

	describe('canSave', () => {
		it('should return false when name is empty', () => {
			component.queryName = '';
			component.queryText = 'SELECT 1';
			expect(component.canSave).toBe(false);
		});

		it('should return false when query is empty', () => {
			component.queryName = 'Test';
			component.queryText = '';
			expect(component.canSave).toBe(false);
		});

		it('should return true when name and query are provided', () => {
			component.queryName = 'Test';
			component.queryText = 'SELECT 1';
			component.saving = false;
			expect(component.canSave).toBe(true);
		});

		it('should return false when saving', () => {
			component.queryName = 'Test';
			component.queryText = 'SELECT 1';
			component.saving = true;
			expect(component.canSave).toBe(false);
		});
	});

	describe('canTest', () => {
		it('should return false when query is empty', () => {
			component.queryText = '';
			expect(component.canTest).toBe(false);
		});

		it('should return true when query is provided', () => {
			component.queryText = 'SELECT 1';
			component.testing = false;
			expect(component.canTest).toBe(true);
		});

		it('should return false when testing', () => {
			component.queryText = 'SELECT 1';
			component.testing = true;
			expect(component.canTest).toBe(false);
		});
	});

	describe('testQuery', () => {
		it('should call testQuery service method', () => {
			component.queryText = 'SELECT * FROM users';
			component.testQuery();
			expect(mockSavedQueriesService.testQuery).toHaveBeenCalledWith('conn-1', {
				query_text: 'SELECT * FROM users',
			});
		});

		it('should set results and columns after successful test', () => {
			component.queryText = 'SELECT * FROM users';
			component.testQuery();
			expect(component.testResults).toEqual([{ name: 'John', count: 10 }]);
			expect(component.resultColumns).toEqual(['name', 'count']);
			expect(component.executionTime).toBe(50);
		});

		it('should auto-select label and value columns', () => {
			component.queryText = 'SELECT * FROM users';
			component.testQuery();
			expect(component.labelColumn).toBe('name');
			expect(component.valueColumn).toBe('count');
		});
	});

	describe('saveQuery', () => {
		it('should call createSavedQuery in create mode', () => {
			component.isEditMode = false;
			component.queryName = 'New Query';
			component.queryText = 'SELECT 1';
			component.saveQuery();
			expect(mockSavedQueriesService.createSavedQuery).toHaveBeenCalledWith('conn-1', {
				name: 'New Query',
				description: undefined,
				query_text: 'SELECT 1',
			});
		});

		it('should navigate to charts list after save', () => {
			component.queryName = 'New Query';
			component.queryText = 'SELECT 1';
			component.saveQuery();
			expect(router.navigate).toHaveBeenCalledWith(['/charts', 'conn-1']);
		});
	});

	describe('cancel', () => {
		it('should navigate to charts list', () => {
			component.cancel();
			expect(router.navigate).toHaveBeenCalledWith(['/charts', 'conn-1']);
		});
	});

	describe('onCodeChange', () => {
		it('should update queryText', () => {
			component.onCodeChange('SELECT * FROM table');
			expect(component.queryText).toBe('SELECT * FROM table');
		});
	});

	describe('hasChartData', () => {
		it('should return false when no results', () => {
			component.testResults = [];
			expect(component.hasChartData).toBe(false);
		});

		it('should return false when no columns selected', () => {
			component.testResults = [{ name: 'John' }];
			component.labelColumn = '';
			component.valueColumn = '';
			expect(component.hasChartData).toBe(false);
		});

		it('should return true when results and columns are set', () => {
			component.testResults = [{ name: 'John', count: 10 }];
			component.labelColumn = 'name';
			component.valueColumn = 'count';
			expect(component.hasChartData).toBe(true);
		});
	});
});
