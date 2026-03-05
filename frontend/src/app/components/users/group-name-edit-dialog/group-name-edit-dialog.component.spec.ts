import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GroupNameEditDialogComponent } from './group-name-edit-dialog.component';

describe('GroupNameEditDialogComponent', () => {
	let component: GroupNameEditDialogComponent;
	let fixture: ComponentFixture<GroupNameEditDialogComponent>;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatDialogModule, MatSnackBarModule, FormsModule, BrowserAnimationsModule, GroupNameEditDialogComponent],
			providers: [
				provideHttpClient(),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		}).compileComponents();
		fixture = TestBed.createComponent(GroupNameEditDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
