import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { EnableTwoFADialogComponent } from './enable-two-fa-dialog.component';

describe('EnableTwoFADialogComponent', () => {
	let component: EnableTwoFADialogComponent;
	let fixture: ComponentFixture<EnableTwoFADialogComponent>;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatDialogModule,
				Angulartics2Module.forRoot(),
				EnableTwoFADialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(EnableTwoFADialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
