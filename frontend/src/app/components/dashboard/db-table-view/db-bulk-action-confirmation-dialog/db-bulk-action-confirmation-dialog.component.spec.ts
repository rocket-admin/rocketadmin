import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { TablesService } from 'src/app/services/tables.service';
import { BbBulkActionConfirmationDialogComponent } from './db-bulk-action-confirmation-dialog.component';

describe('BbBulkActionConfirmationDialogComponent', () => {
	let component: BbBulkActionConfirmationDialogComponent;
	let fixture: ComponentFixture<BbBulkActionConfirmationDialogComponent>;
	let tablesService: TablesService;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				MatDialogModule,
				Angulartics2Module.forRoot(),
				BbBulkActionConfirmationDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						primaryKeys: [
							{
								column_name: 'id',
							},
						],
						selectedRows: [
							{
								id: '1234',
								name: 'Anna',
							},
							{
								id: '5678',
								name: 'John',
							},
						],
					},
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(BbBulkActionConfirmationDialogComponent);
		component = fixture.componentInstance;
		tablesService = TestBed.inject(TablesService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call delete rows if no action id', () => {
		component.connectionID = '12345678';
		component.selectedTableName = 'users';
		component.data.title = 'delete rows';
		component.data.primaryKeys = [{ id: 1 }, { id: 2 }, { id: 3 }];
		const fakeDeleteRows = vi.spyOn(tablesService, 'bulkDelete').mockReturnValue(of());

		component.handleConfirmedActions();

		expect(fakeDeleteRows).toHaveBeenCalledWith('12345678', 'users', [{ id: 1 }, { id: 2 }, { id: 3 }]);
		expect(component.submitting).toBe(false);
	});
});
