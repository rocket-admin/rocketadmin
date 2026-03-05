import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MasterPasswordDialogComponent } from './master-password-dialog.component';

describe('MasterPasswordDialogComponent', () => {
	let component: MasterPasswordDialogComponent;
	let fixture: ComponentFixture<MasterPasswordDialogComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				MatDialogModule,
				FormsModule,
				MasterPasswordDialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: {} },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(MasterPasswordDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
