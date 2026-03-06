import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { Angulartics2Module } from 'angulartics2';
import { ActionDeleteDialogComponent } from './action-delete-dialog.component';

describe('ActionDeleteDialogComponent', () => {
	let component: ActionDeleteDialogComponent;
	let fixture: ComponentFixture<ActionDeleteDialogComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				RouterTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				Angulartics2Module.forRoot(),
				ActionDeleteDialogComponent,
			],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ActionDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
