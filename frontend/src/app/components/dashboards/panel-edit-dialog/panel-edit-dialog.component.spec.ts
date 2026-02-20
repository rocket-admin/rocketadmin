import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DashboardWidget } from 'src/app/models/dashboard';
import { SavedQuery } from 'src/app/models/saved-query';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { PanelEditDialogComponent } from './panel-edit-dialog.component';

type PanelEditDialogTestable = PanelEditDialogComponent & {
	form: ReturnType<typeof import('@angular/forms').FormBuilder.prototype.group>;
	isEdit: boolean;
	onSubmit(): void;
};

describe('PanelEditDialogComponent', () => {
	let component: PanelEditDialogComponent;
	let testable: PanelEditDialogTestable;
	let fixture: ComponentFixture<PanelEditDialogComponent>;
	let mockDashboardsService: Partial<DashboardsService>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;
	let savedQueriesSignal: WritableSignal<SavedQuery[]>;
	let mockDialogRef: { close: ReturnType<typeof vi.fn> };

	const mockSavedQueries: SavedQuery[] = [
		{
			id: 'query-1',
			name: 'Avg Clicks / Short URL',
			description: null,
			widget_type: 'chart',
			chart_type: 'bar',
			widget_options: null,
			query_text: 'SELECT * FROM stats',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		{
			id: 'query-2',
			name: 'Total Users',
			description: 'Count of all users',
			widget_type: 'counter',
			chart_type: null,
			widget_options: { value_column: 'count' },
			query_text: 'SELECT COUNT(*) as count FROM users',
			connection_id: 'test-conn',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
	];

	function setupTestBed(widget: DashboardWidget | null) {
		savedQueriesSignal = signal<SavedQuery[]>(mockSavedQueries);
		mockDialogRef = { close: vi.fn() };

		mockDashboardsService = {
			createWidget: vi.fn().mockResolvedValue({ id: 'new-widget' }),
			updateWidget: vi.fn().mockResolvedValue({ id: 'updated-widget' }),
		} as Partial<DashboardsService>;

		mockSavedQueriesService = {
			savedQueries: savedQueriesSignal.asReadonly(),
			setActiveConnection: vi.fn(),
		};

		return TestBed.configureTestingModule({
			imports: [PanelEditDialogComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: MAT_DIALOG_DATA,
					useValue: { connectionId: 'test-conn', dashboardId: 'test-dash', widget },
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: DashboardsService, useValue: mockDashboardsService },
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
			],
		}).compileComponents();
	}

	describe('Add widget mode', () => {
		beforeEach(async () => {
			await setupTestBed(null);
			fixture = TestBed.createComponent(PanelEditDialogComponent);
			component = fixture.componentInstance;
			testable = component as PanelEditDialogTestable;
			fixture.detectChanges();
		});

		it('should create', () => {
			expect(component).toBeTruthy();
		});

		it('should be in add mode when widget is null', () => {
			expect(testable.isEdit).toBe(false);
		});

		it('should require query_id when adding widget', () => {
			const queryIdControl = testable.form.get('query_id');
			expect(queryIdControl?.hasError('required')).toBe(true);
		});

		it('should call setActiveConnection on init', () => {
			expect(mockSavedQueriesService.setActiveConnection).toHaveBeenCalledWith('test-conn');
		});

		it('should call createWidget with position data when form is submitted', () => {
			testable.form.get('query_id')?.setValue('query-1');
			testable.onSubmit();

			expect(mockDashboardsService.createWidget).toHaveBeenCalledWith('test-conn', 'test-dash', {
				query_id: 'query-1',
				position_x: 0,
				position_y: 0,
				width: 4,
				height: 4,
			});
		});

		it('should close dialog after successful widget creation', async () => {
			testable.form.get('query_id')?.setValue('query-1');
			await testable.onSubmit();
			await fixture.whenStable();

			expect(mockDialogRef.close).toHaveBeenCalledWith(true);
		});
	});

	describe('Edit widget mode', () => {
		const existingWidget: DashboardWidget = {
			id: 'widget-123',
			position_x: 2,
			position_y: 3,
			width: 4,
			height: 4,
			query_id: 'query-1',
			dashboard_id: 'test-dash',
		};

		beforeEach(async () => {
			await setupTestBed(existingWidget);
			fixture = TestBed.createComponent(PanelEditDialogComponent);
			component = fixture.componentInstance;
			testable = component as PanelEditDialogTestable;
			fixture.detectChanges();
		});

		it('should be in edit mode when widget is provided', () => {
			expect(testable.isEdit).toBe(true);
		});

		it('should initialize form with existing query_id', () => {
			expect(testable.form.get('query_id')?.value).toBe('query-1');
		});

		it('should call updateWidget when form is submitted', () => {
			testable.form.get('query_id')?.setValue('query-2');
			testable.onSubmit();

			expect(mockDashboardsService.updateWidget).toHaveBeenCalledWith('test-conn', 'test-dash', 'widget-123', {
				query_id: 'query-2',
			});
		});

		it('should close dialog after successful widget update', async () => {
			testable.form.get('query_id')?.setValue('query-2');
			await testable.onSubmit();
			await fixture.whenStable();

			expect(mockDialogRef.close).toHaveBeenCalledWith(true);
		});
	});

	describe('Widget without linked query', () => {
		const widgetWithoutQuery: DashboardWidget = {
			id: 'widget-456',
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 4,
			query_id: null,
			dashboard_id: 'test-dash',
		};

		beforeEach(async () => {
			await setupTestBed(widgetWithoutQuery);
			fixture = TestBed.createComponent(PanelEditDialogComponent);
			component = fixture.componentInstance;
			testable = component as PanelEditDialogTestable;
			fixture.detectChanges();
		});

		it('should initialize form with empty query_id', () => {
			expect(testable.form.get('query_id')?.value).toBe('');
		});

		it('should show validation error for empty query_id', () => {
			expect(testable.form.get('query_id')?.hasError('required')).toBe(true);
		});
	});
});
