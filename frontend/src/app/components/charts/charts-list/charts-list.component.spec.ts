import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { BehaviorSubject, of } from 'rxjs';
import { SavedQuery } from 'src/app/models/saved-query';
import { ConnectionsService } from 'src/app/services/connections.service';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartDeleteDialogComponent } from '../chart-delete-dialog/chart-delete-dialog.component';
import { ChartsListComponent } from './charts-list.component';

describe('ChartsListComponent', () => {
	let component: ChartsListComponent;
	let fixture: ComponentFixture<ChartsListComponent>;
	let mockSavedQueriesService: any;
	let mockConnectionsService: any;
	let mockDialog: any;
	let savedQueriesUpdatedSubject: BehaviorSubject<string>;

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
		savedQueriesUpdatedSubject = new BehaviorSubject<string>('');

		mockSavedQueriesService = {
			fetchSavedQueries: vi.fn().mockImplementation(() => of([mockSavedQuery])),
			cast: savedQueriesUpdatedSubject.asObservable(),
		} as any;

		mockConnectionsService = {
			getCurrentConnectionTitle: vi.fn().mockReturnValue(of('Test Connection')),
		} as any;

		mockDialog = {
			open: vi.fn(),
		} as any;

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

	it('should load saved queries on init', () => {
		expect(mockSavedQueriesService.fetchSavedQueries).toHaveBeenCalledWith('conn-1');
	});

	it('should set page title on init', () => {
		expect(mockConnectionsService.getCurrentConnectionTitle).toHaveBeenCalled();
	});

	it('should initialize with loading true then false after load', () => {
		expect(component.loading).toBe(false);
	});

	it('should have correct displayed columns', () => {
		expect(component.displayedColumns).toEqual(['name', 'description', 'updatedAt', 'actions']);
	});

	describe('filterQueries', () => {
		it('should show all queries when search is empty', () => {
			component.savedQueries = [mockSavedQuery];
			component.searchQuery = '';
			component.filterQueries();
			expect(component.filteredQueries).toEqual([mockSavedQuery]);
		});

		it('should filter by name', () => {
			component.savedQueries = [mockSavedQuery];
			component.searchQuery = 'Test';
			component.filterQueries();
			expect(component.filteredQueries).toEqual([mockSavedQuery]);
		});

		it('should filter by description', () => {
			component.savedQueries = [mockSavedQuery];
			component.searchQuery = 'description';
			component.filterQueries();
			expect(component.filteredQueries).toEqual([mockSavedQuery]);
		});

		it('should return empty when no match', () => {
			component.savedQueries = [mockSavedQuery];
			component.searchQuery = 'nonexistent';
			component.filterQueries();
			expect(component.filteredQueries).toEqual([]);
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

	describe('savedQueriesUpdated subscription', () => {
		it('should reload queries when savedQueriesUpdated emits', () => {
			mockSavedQueriesService.fetchSavedQueries.mockClear();

			savedQueriesUpdatedSubject.next('created');

			expect(mockSavedQueriesService.fetchSavedQueries).toHaveBeenCalled();
		});

		it('should not reload queries when savedQueriesUpdated emits empty string', () => {
			mockSavedQueriesService.fetchSavedQueries.mockClear();

			savedQueriesUpdatedSubject.next('');

			expect(mockSavedQueriesService.fetchSavedQueries).not.toHaveBeenCalled();
		});
	});

	describe('ngOnDestroy', () => {
		it('should unsubscribe from all subscriptions', () => {
			const unsubscribeSpy = vi.spyOn(component.subscriptions[0], 'unsubscribe');

			component.ngOnDestroy();

			expect(unsubscribeSpy).toHaveBeenCalled();
		});
	});
});
