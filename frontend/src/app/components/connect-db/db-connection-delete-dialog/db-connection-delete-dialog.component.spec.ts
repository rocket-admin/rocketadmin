import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { Angulartics2, Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog.component';

describe('DbConnectionDeleteDialogComponent', () => {
	let component: DbConnectionDeleteDialogComponent;
	let fixture: ComponentFixture<DbConnectionDeleteDialogComponent>;
	let routerSpy;
	let fakeConnectionsService = { deleteConnection: vi.fn() };

	const mockDialogRef = {
		close: () => {},
	};

	beforeEach(async (): Promise<void> => {
		routerSpy = { navigate: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				MatDialogModule,
				FormsModule,
				MatRadioModule,
				Angulartics2Module.forRoot(),
				DbConnectionDeleteDialogComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{ provide: MAT_DIALOG_DATA, useValue: {} },
				{ provide: MatDialogRef, useValue: mockDialogRef },
				{ provide: Router, useValue: routerSpy },
				{
					provide: ConnectionsService,
					useValue: fakeConnectionsService,
				},
				Angulartics2,
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DbConnectionDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should close confirmation dilog and redirect to connection list if deleting is successfull', () => {
		fakeConnectionsService.deleteConnection.mockReturnValue(of(true));
		vi.spyOn(component.dialogRef, 'close');

		component.deleteConnection();

		expect(component.submitting).toBe(false);
		expect(component.dialogRef.close).toHaveBeenCalled();
		expect(routerSpy.navigate).toHaveBeenCalledWith(['/connections-list']);
	});

	it('should stop submitting if deleting is completed', () => {
		fakeConnectionsService.deleteConnection.mockReturnValue(of(false));

		component.deleteConnection();

		expect(component.submitting).toBe(false);
	});
});
