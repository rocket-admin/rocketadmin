import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DbTableExportDialogComponent } from './db-table-export-dialog.component';

describe('DbTableExportDialogComponent', () => {
	let component: DbTableExportDialogComponent;
	let fixture: ComponentFixture<DbTableExportDialogComponent>;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatDialogModule,
				MatSnackBarModule,
				FormsModule,
				Angulartics2Module.forRoot(),
				DbTableExportDialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionID: '12345678',
						tableName: 'users',
						sortColumn: 'first_name',
						sortOrder: 'asc',
						filters: { first_name: { startswith: 'A' } },
						search: '',
					},
				},
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DbTableExportDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
