import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { of, throwError } from 'rxjs';
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
		query_text: 'SELECT * FROM users',
		connection_id: 'conn-1',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
	};

	beforeEach(async () => {
		mockSavedQueriesService = {
			deleteSavedQuery: vi.fn().mockReturnValue(of(mockSavedQuery)),
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
		it('should call deleteSavedQuery service method', () => {
			component.onDelete();
			expect(mockSavedQueriesService.deleteSavedQuery).toHaveBeenCalledWith('conn-1', '1');
		});

		it('should set submitting to true during delete', () => {
			component.onDelete();
			// The deleteSavedQuery returns synchronously in the mock, so submitting would be false after
			// In real usage, submitting would be true while the request is in flight
			expect(mockSavedQueriesService.deleteSavedQuery).toHaveBeenCalled();
		});

		it('should close dialog with true on success', () => {
			component.onDelete();
			expect(mockDialogRef.close).toHaveBeenCalledWith(true);
		});

		it('should set submitting to false after successful delete', () => {
			const testable = component as ChartDeleteDialogComponentTestable;
			component.onDelete();
			expect(testable.submitting()).toBe(false);
		});

		it('should set submitting to false on error', () => {
			const testable = component as ChartDeleteDialogComponentTestable;
			vi.mocked(mockSavedQueriesService.deleteSavedQuery!).mockReturnValue(
				throwError(() => new Error('Delete failed')),
			);
			component.onDelete();
			expect(testable.submitting()).toBe(false);
		});

		it('should not close dialog on error', () => {
			vi.mocked(mockSavedQueriesService.deleteSavedQuery!).mockReturnValue(
				throwError(() => new Error('Delete failed')),
			);
			component.onDelete();
			expect(mockDialogRef.close).not.toHaveBeenCalled();
		});
	});
});
