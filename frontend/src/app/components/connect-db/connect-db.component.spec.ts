import { provideHttpClient } from '@angular/common/http';
import { forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Angulartics2Module } from 'angulartics2';
import { of } from 'rxjs';
import { AlertActionType, AlertType } from 'src/app/models/alert';
import { ConnectionType, DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { ConnectDBComponent } from './connect-db.component';
import { DbConnectionConfirmDialogComponent } from './db-connection-confirm-dialog/db-connection-confirm-dialog.component';
import { DbConnectionDeleteDialogComponent } from './db-connection-delete-dialog/db-connection-delete-dialog.component';

describe('ConnectDBComponent', () => {
	let component: ConnectDBComponent;
	let fixture: ComponentFixture<ConnectDBComponent>;
	let dialog: MatDialog;

	const fakeNotifications = {
		showErrorSnackbar: vi.fn(),
		showSuccessSnackbar: vi.fn(),
		showAlert: vi.fn(),
		dismissAlert: vi.fn(),
	};
	const fakeConnectionsService = {
		currentConnection: vi.fn(),
		currentConnectionAccessLevel: vi.fn(),
		testConnection: vi.fn(),
		createConnection: vi.fn(),
		updateConnection: vi.fn(),
		getCurrentConnectionTitle: vi.fn(),
		currentConnectionID: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4',
	};

	const connectionCredsApp = {
		title: 'Test connection via SSH tunnel to mySQL',
		masterEncryption: false,
		type: DBtype.MySQL,
		host: 'database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com',
		port: '3306',
		username: 'admin',
		database: 'testDB',
		schema: null,
		sid: null,
		id: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4',
		ssh: true,
		sshHost: '3.134.99.192',
		sshPort: '22',
		sshUsername: 'ubuntu',
		ssl: false,
		cert: null,
		connectionType: ConnectionType.Direct,
		azure_encryption: false,
		signing_key: '',
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatSelectModule,
				MatRadioModule,
				MatInputModule,
				MatDialogModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				ConnectDBComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([{ path: 'dashboard/:id', component: ConnectDBComponent }]),
				{
					provide: NG_VALUE_ACCESSOR,
					useExisting: forwardRef(() => ConnectDBComponent),
					multi: true,
				},
				{ provide: NotificationsService, useValue: fakeNotifications },
				{ provide: ConnectionsService, useValue: fakeConnectionsService },
			],
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ConnectDBComponent);
		component = fixture.componentInstance;
		dialog = TestBed.inject(MatDialog);

		// @ts-expect-error
		global.window.fbq = vi.fn();
		global.window.Intercom = vi.fn();

		fakeConnectionsService.currentConnection.mockReturnValue(connectionCredsApp);
		fakeConnectionsService.getCurrentConnectionTitle.mockReturnValue(of('Test connection via SSH tunnel to mySQL'));
		// fakeConnectionsService.currentConnectionAccessLevel.mockReturnValue('edit');

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should show Success snackbar if test passes successfully', () => {
		fakeConnectionsService.testConnection.mockReturnValue(
			of({
				result: true,
			}),
		);

		component.testConnection();
		expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Connection is live');

		fakeNotifications.showSuccessSnackbar.mockClear();
	});

	it('should show Error alert if test passes unsuccessfully', () => {
		fakeConnectionsService.testConnection.mockReturnValue(
			of({
				result: false,
				message: 'Error in hostname.',
			}),
		);

		component.testConnection();
		expect(fakeNotifications.showAlert).toHaveBeenCalledWith(AlertType.Error, 'Error in hostname.', [
			expect.objectContaining({
				type: AlertActionType.Button,
				caption: 'Dismiss',
			}),
		]);

		fakeNotifications.showAlert.mockClear();
	});

	it('should set 1521 port for Oracle db type', () => {
		component.db.type = DBtype.Oracle;
		component.dbTypeChange();

		expect(component.db.port).toEqual('1521');
	});

	it('should show Copy message', () => {
		component.showCopyNotification('Connection token was copied to clipboard.');
		expect(fakeNotifications.showSuccessSnackbar).toHaveBeenCalledWith('Connection token was copied to clipboard.');

		fakeNotifications.showSuccessSnackbar.mockClear();
	});

	it('should generate password if toggle is enabled', () => {
		component.generatePassword(true);
		expect(component.masterKey).toBeDefined();
	});

	it('should open delete connection dialog', () => {
		const fakeDialogOpen = vi.spyOn(dialog, 'open');
		const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as Event;

		component.confirmDeleteConnection(connectionCredsApp, event);
		expect(fakeDialogOpen).toHaveBeenCalledWith(DbConnectionDeleteDialogComponent, {
			width: '32em',
			data: connectionCredsApp,
		});
	});

	it('should create direct connection', () => {
		fakeConnectionsService.createConnection.mockReturnValue(of(connectionCredsApp));
		vi.spyOn(component, 'db', 'get').mockReturnValue(connectionCredsApp);
		component.createConnectionRequest();

		expect(component.connectionID).toEqual('9d5f6d0f-9516-4598-91c4-e4fe6330b4d4');
	});

	it('should create agent connection and set token', () => {
		const dbApp = {
			id: null,
			title: 'Agent connection',
			type: DBtype.Oracle,
			port: '5432',
			connectionType: ConnectionType.Agent,
		} as any;

		const dbRes = {
			id: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4',
			title: 'Agent connection',
			type: 'agent_oracle',
			port: 5432,
			token: '1234-abcd-0987',
		};

		fakeConnectionsService.createConnection.mockReturnValue(of(dbRes));
		vi.spyOn(component, 'db', 'get').mockReturnValue(dbApp);
		component.createConnectionRequest();

		expect(component.connectionID).toEqual('9d5f6d0f-9516-4598-91c4-e4fe6330b4d4');
		expect(component.connectionToken).toEqual('1234-abcd-0987');
	});

	it('should update direct connection', () => {
		fakeConnectionsService.updateConnection.mockReturnValue(of(connectionCredsApp));
		vi.spyOn(component, 'db', 'get').mockReturnValue(connectionCredsApp);
		component.updateConnectionRequest();

		// expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard/9d5f6d0f-9516-4598-91c4-e4fe6330b4d4']);
	});

	it('should update agent connection and set token', () => {
		const dbApp = {
			id: null,
			title: 'Agent connection',
			type: DBtype.Oracle,
			port: '5432',
			connectionType: ConnectionType.Agent,
		} as any;

		const dbRes = {
			connection: {
				id: '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4',
				title: 'Agent connection',
				type: 'agent_oracle',
				port: 5432,
				token: '1234-abcd-0987',
			},
		};

		fakeConnectionsService.updateConnection.mockReturnValue(of(dbRes));
		vi.spyOn(component, 'db', 'get').mockReturnValue(dbApp);
		component.updateConnectionRequest();

		expect(component.connectionToken).toEqual('1234-abcd-0987');
	});

	it('should open dialog on test error', () => {
		const fakeDialogOpen = vi.spyOn(dialog, 'open');
		vi.spyOn(component, 'db', 'get').mockReturnValue(connectionCredsApp);
		component.masterKey = 'master_password_12345678';
		component.handleConnectionError('Hostname is invalid');

		expect(fakeDialogOpen).toHaveBeenCalledWith(DbConnectionConfirmDialogComponent, {
			width: '25em',
			data: {
				dbCreds: connectionCredsApp,
				masterKey: 'master_password_12345678',
				errorMessage: 'Hostname is invalid',
			},
		});
	});
});
