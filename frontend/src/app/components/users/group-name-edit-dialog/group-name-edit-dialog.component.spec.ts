import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CodeEditorModule } from '@ngstack/code-editor';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
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
				{ provide: MAT_DIALOG_DATA, useValue: { id: 'test-id', title: 'Test Group', cedarPolicy: '' } },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		})
			.overrideComponent(GroupNameEditDialogComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
		fixture = TestBed.createComponent(GroupNameEditDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
