import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog.component';

describe('DbConnectionConfirmDialogComponent', () => {
	let component: DbConnectionConfirmDialogComponent;
	let fixture: ComponentFixture<DbConnectionConfirmDialogComponent>;

	let routerSpy;
	let fakeConnectionsService = {
		updateConnection: vi.fn(),
		createConnection: vi.fn(),
	};

	beforeEach(async (): Promise<void> => {
		routerSpy = { navigate: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [MatSnackBarModule, MatDialogModule, Angulartics2Module.forRoot(), DbConnectionConfirmDialogComponent],
			providers: [
				provideHttpClient(),
				provideRouter([]),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						dbCreds: {
							id: '12345678',
						},
					},
				},
				{ provide: MatDialogRef, useValue: {} },
				{ provide: Router, useValue: routerSpy },
				{
					provide: ConnectionsService,
					useValue: fakeConnectionsService,
				},
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(DbConnectionConfirmDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should redirect on dashboard after connection edited', () => {
		fakeConnectionsService.updateConnection.mockReturnValue(of(true));
		component.editConnection();

		expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/12345678']);
	});

	it('should stop submitting if editing connection completed', () => {
		fakeConnectionsService.updateConnection.mockReturnValue(of(false));
		component.editConnection();

		expect(component.submitting).toBe(false);
	});

	it('should redirect on dashboard after connection added', () => {
		fakeConnectionsService.createConnection.mockReturnValue(
			of({
				id: '12345678',
			}),
		);
		component.createConnection();

		expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/12345678']);
	});

	it('should stop submitting if adding connection completed', () => {
		fakeConnectionsService.createConnection.mockReturnValue(of(false));
		component.createConnection();

		expect(component.submitting).toBe(false);
	});
});
