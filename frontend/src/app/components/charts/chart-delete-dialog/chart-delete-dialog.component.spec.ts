import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { SavedQuery } from 'src/app/models/saved-query';
import { SavedQueriesService } from 'src/app/services/saved-queries.service';
import { ChartDeleteDialogComponent } from './chart-delete-dialog.component';

type ChartDeleteDialogComponentTestable = ChartDeleteDialogComponent & {
	submitting: WritableSignal<boolean>;
};

describe('ChartDeleteDialogComponent', () => {
	let component: ChartDeleteDialogComponent;
	let fixture: ComponentFixture<ChartDeleteDialogComponent>;
	let mockSavedQueriesService: Partial<SavedQueriesService>;
	let mockDialogRef: Partial<MatDialogRef<ChartDeleteDialogComponent>>;

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
		mockSavedQueriesService = {
			deleteSavedQuery: vi.fn().mockResolvedValue(mockSavedQuery),
		};

		mockDialogRef = {
			close: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [
				ChartDeleteDialogComponent,
				BrowserAnimationsModule,
				MatSnackBarModule,
				MatDialogModule,
				Angulartics2Module.forRoot(),
			],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: SavedQueriesService, useValue: mockSavedQueriesService },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{
					provide: MAT_DIALOG_DATA,
					useValue: { query: mockSavedQuery, connectionId: 'conn-1' },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ChartDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should have submitting signal initialized to false', () => {
		const testable = component as ChartDeleteDialogComponentTestable;
		expect(testable.submitting()).toBe(false);
	});

	describe('onDelete', () => {
		it('should call deleteSavedQuery service method', async () => {
			await component.onDelete();
			expect(mockSavedQueriesService.deleteSavedQuery).toHaveBeenCalledWith('conn-1', '1');
		});

		it('should set submitting to true during delete', () => {
			component.onDelete();
			// The deleteSavedQuery returns asynchronously, so submitting should be true while in flight
			const testable = component as ChartDeleteDialogComponentTestable;
			expect(testable.submitting()).toBe(true);
		});

		it('should close dialog with true on success', async () => {
			await component.onDelete();
			expect(mockDialogRef.close).toHaveBeenCalledWith(true);
		});

		it('should set submitting to false after successful delete', async () => {
			const testable = component as ChartDeleteDialogComponentTestable;
			await component.onDelete();
			expect(testable.submitting()).toBe(false);
		});

		it('should set submitting to false on error', async () => {
			const testable = component as ChartDeleteDialogComponentTestable;
			vi.mocked(mockSavedQueriesService.deleteSavedQuery!).mockResolvedValue(null);
			await component.onDelete();
			expect(testable.submitting()).toBe(false);
		});

		it('should not close dialog on error', async () => {
			vi.mocked(mockSavedQueriesService.deleteSavedQuery!).mockResolvedValue(null);
			await component.onDelete();
			expect(mockDialogRef.close).not.toHaveBeenCalled();
		});
	});
});
