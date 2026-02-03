import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { QueryUpdateEvent, SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartDeleteDialogComponent } from '../chart-delete-dialog/chart-delete-dialog.component';
import { ChartsListComponent } from './charts-list.component';

type ChartsListComponentTestable = ChartsListComponent & {
	savedQueries: Signal<SavedQuery[]>;
	loading: Signal<boolean>;
	searchQuery: WritableSignal<string>;
	filteredQueries: Signal<SavedQuery[]>;
};

describe('ChartsListComponent', () => {
	let component: ChartsListComponent;
	let fixture: ComponentFixture<ChartsListComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;
	let mockConnectionsService: Partial<ConnectionsService>;
	let mockDialog: Partial<MatDialog>;
	let queriesUpdatedSignal: WritableSignal<QueryUpdateEvent>;
	let savedQueriesSignal: WritableSignal<SavedQuery[]>;
	let savedQueriesLoadingSignal: WritableSignal<boolean>;

	const mockSavedQuery: SavedQuery = {
		id: '1',
		name: 'Test Query',
		description: 'Test description',
		widget_type: 'chart',
		chart_type: 'bar',
		widget_options: null,
		query_text: 'SELECT * FROM users',
		connection_id: 'conn-1',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	};

	beforeEach(async () => {
		queriesUpdatedSignal = signal<QueryUpdateEvent>('');
		savedQueriesSignal = signal<SavedQuery[]>([mockSavedQuery]);
		savedQueriesLoadingSignal = signal<boolean>(false);

		mockSavedQueriesService = {
			savedQueries: savedQueriesSignal.asReadonly(),
			savedQueriesLoading: savedQueriesLoadingSignal.asReadonly(),
			queriesUpdated: queriesUpdatedSignal.asReadonly(),
			setActiveConnection: vi.fn(),
			refreshSavedQueries: vi.fn(),
		};

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		};

		mockDialog = {
			open: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [
				ChartsListComponent,
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
				{ provide: MatDialog, useValue: mockDialog },
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: {
							paramMap: {
								get: () => 'conn-1',
							},
						},
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ChartsListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should set active connection on init', () => {
		expect(mockSavedQueriesService.setActiveConnection).toHaveBeenCalledWith('conn-1');
	});

	it('should set page title on init', () => {
		expect(mockConnectionsService.getCurrentConnectionTitle).toHaveBeenCalled();
	});

	it('should initialize with loading from service', () => {
		const testable = component as ChartsListComponentTestable;
		expect(testable.loading()).toBe(false);
	});

	it('should have correct displayed columns', () => {
		expect(component.displayedColumns).toEqual(['name', 'description', 'updatedAt', 'actions']);
	});

	describe('filteredQueries computed', () => {
		it('should show all queries when search is empty', () => {
			const testable = component as ChartsListComponentTestable;
			savedQueriesSignal.set([mockSavedQuery]);
			testable.searchQuery.set('');
			expect(testable.filteredQueries()).toEqual([mockSavedQuery]);
		});

		it('should filter by name', () => {
			const testable = component as ChartsListComponentTestable;
			savedQueriesSignal.set([mockSavedQuery]);
			testable.searchQuery.set('Test');
			expect(testable.filteredQueries()).toEqual([mockSavedQuery]);
		});

		it('should filter by description', () => {
			const testable = component as ChartsListComponentTestable;
			savedQueriesSignal.set([mockSavedQuery]);
			testable.searchQuery.set('description');
			expect(testable.filteredQueries()).toEqual([mockSavedQuery]);
		});

		it('should return empty when no match', () => {
			const testable = component as ChartsListComponentTestable;
			savedQueriesSignal.set([mockSavedQuery]);
			testable.searchQuery.set('nonexistent');
			expect(testable.filteredQueries()).toEqual([]);
		});
	});

	describe('openDeleteDialog', () => {
		it('should open delete dialog with query data', () => {
			component.openDeleteDialog(mockSavedQuery);
			expect(mockDialog.open).toHaveBeenCalledWith(ChartDeleteDialogComponent, {
				width: '400px',
				data: { query: mockSavedQuery, connectionId: 'conn-1' },
			});
		});
	});

	describe('queriesUpdated effect', () => {
		it('should refresh queries when queriesUpdated signal changes', () => {
			vi.mocked(mockSavedQueriesService.refreshSavedQueries!).mockClear();

			// Trigger the signal change
			queriesUpdatedSignal.set('created');
			TestBed.flushEffects();

			expect(mockSavedQueriesService.refreshSavedQueries).toHaveBeenCalled();
		});

		it('should not refresh queries when queriesUpdated signal is empty', () => {
			vi.mocked(mockSavedQueriesService.refreshSavedQueries!).mockClear();

			// Set empty value
			queriesUpdatedSignal.set('');
			TestBed.flushEffects();

			expect(mockSavedQueriesService.refreshSavedQueries).not.toHaveBeenCalled();
		});
	});
});
