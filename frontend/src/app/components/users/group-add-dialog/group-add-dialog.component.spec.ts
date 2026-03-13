import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CodeEditorModule } from '@ngstack/code-editor';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { UsersService } from 'src/app/services/users.service';
import { MockCodeEditorComponent } from 'src/app/testing/code-editor.mock';
import { GroupAddDialogComponent } from './group-add-dialog.component';

describe('GroupAddDialogComponent', () => {
	let component: GroupAddDialogComponent;
	let fixture: ComponentFixture<GroupAddDialogComponent>;
	let usersService: UsersService;

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async () => {
		TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatDialogModule,
				Angulartics2Module.forRoot({}),
				GroupAddDialogComponent,
				BrowserAnimationsModule,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
			],
		})
			.overrideComponent(GroupAddDialogComponent, {
				remove: { imports: [CodeEditorModule] },
				add: { imports: [MockCodeEditorComponent], schemas: [NO_ERRORS_SCHEMA] },
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(GroupAddDialogComponent);
		component = fixture.componentInstance;
		usersService = TestBed.inject(UsersService);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should call create user group service', () => {
		component.groupTitle = 'Sellers';
		component.connectionID = '12345678';
		const fakeCreateUsersGroup = vi.spyOn(usersService, 'createUsersGroup').mockReturnValue(of());
		vi.spyOn(mockDialogRef, 'close');

		component.addGroup();

		expect(fakeCreateUsersGroup).toHaveBeenCalledWith('12345678', 'Sellers', null);
		// expect(component.dialogRef.close).toHaveBeenCalled();
		expect(component.submitting).toBe(false);
	});
});
