import { provideHttpClient } from '@angular/common/http';
import { forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
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
	let mockMatDialog: { open: ReturnType<typeof vi.fn> };

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
		canEditConnection: vi.fn().mockReturnValue(true),
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
		mockMatDialog = { open: vi.fn() };

		await TestBed.configureTestingModule({
			imports: [
				MatSnackBarModule,
				FormsModule,
				MatSelectModule,
				MatRadioModule,
				MatInputModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				ConnectDBComponent,
			],
			providers: [
				provideHttpClient(),
				provideRouter([
					{ path: 'dashboard/:id', component: ConnectDBComponent },
					{ path: 'auto-configure/:connection-id', component: ConnectDBComponent },
				]),
				{
					provide: NG_VALUE_ACCESSOR,
					useExisting: forwardRef(() => ConnectDBComponent),
					multi: true,
				},
				{ provide: NotificationsService, useValue: fakeNotifications },
				{ provide: ConnectionsService, useValue: fakeConnectionsService },
			],
		})
			.overrideComponent(ConnectDBComponent, {
				set: {
					providers: [{ provide: MatDialog, useFactory: () => mockMatDialog }],
				},
			})
			.compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ConnectDBComponent);
		component = fixture.componentInstance;

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
		const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() } as unknown as Event;

		component.confirmDeleteConnection(connectionCredsApp, event);
		expect(mockMatDialog.open).toHaveBeenCalledWith(DbConnectionDeleteDialogComponent, {
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
		fakeConnectionsService.updateConnection.mockReturnValue(of({ connection: connectionCredsApp }));
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
		vi.spyOn(component, 'db', 'get').mockReturnValue(connectionCredsApp);
		component.masterKey = 'master_password_12345678';
		component.handleConnectionError('Hostname is invalid');

		expect(mockMatDialog.open).toHaveBeenCalledWith(DbConnectionConfirmDialogComponent, {
			width: '32em',
			data: {
				dbCreds: connectionCredsApp,
				provider: 'amazon',
				masterKey: 'master_password_12345678',
				errorMessage: 'Hostname is invalid',
			},
		});
	});

	describe('Connection string functionality', () => {
		it('should parse a PostgreSQL connection string and populate db fields', () => {
			component.connectionString = 'postgresql://myuser:mypass@db.example.com:5432/mydb';
			component.onConnectionStringChange(null);

			expect(component.db.type).toBe(DBtype.Postgres);
			expect(component.db.host).toBe('db.example.com');
			expect(component.db.port).toBe('5432');
			expect(component.db.username).toBe('myuser');
			expect(component.db.password).toBe('mypass');
			expect(component.db.database).toBe('mydb');
		});

		it('should parse a MySQL connection string and populate db fields', () => {
			component.connectionString = 'mysql://root:secret@localhost:3306/app_db';
			component.onConnectionStringChange(null);

			expect(component.db.type).toBe(DBtype.MySQL);
			expect(component.db.host).toBe('localhost');
			expect(component.db.port).toBe('3306');
			expect(component.db.username).toBe('root');
			expect(component.db.password).toBe('secret');
			expect(component.db.database).toBe('app_db');
		});

		it('should parse a MongoDB connection string with authSource option', () => {
			component.connectionString = 'mongodb://admin:pass123@mongo.host.com:27017/mydb?authSource=admin';
			component.onConnectionStringChange(null);

			expect(component.db.type).toBe(DBtype.Mongo);
			expect(component.db.host).toBe('mongo.host.com');
			expect(component.db.port).toBe('27017');
			expect(component.db.username).toBe('admin');
			expect(component.db.password).toBe('pass123');
			expect(component.db.database).toBe('mydb');
			expect(component.db.authSource).toBe('admin');
			expect(component.autoFilledFields.has('authSource')).toBe(true);
		});

		it('should set autoFilledFields for all parsed fields', () => {
			component.connectionString = 'postgresql://user:pass@host:5432/db';
			component.onConnectionStringChange(null);

			expect(component.autoFilledFields.has('host')).toBe(true);
			expect(component.autoFilledFields.has('port')).toBe(true);
			expect(component.autoFilledFields.has('username')).toBe(true);
			expect(component.autoFilledFields.has('password')).toBe(true);
			expect(component.autoFilledFields.has('database')).toBe(true);
		});

		it('should set ssl to true when sslmode=require is in connection string', () => {
			component.connectionString = 'postgresql://user:pass@host:5432/db?sslmode=require';
			component.onConnectionStringChange(null);

			expect(component.db.ssl).toBe(true);
		});

		it('should set schema when schema option is present', () => {
			component.connectionString = 'postgresql://user:pass@host:5432/db?schema=my_schema';
			component.onConnectionStringChange(null);

			expect(component.db.schema).toBe('my_schema');
			expect(component.autoFilledFields.has('schema')).toBe(true);
		});

		it('should reset fieldsOverridden to false after parsing', () => {
			component.fieldsOverridden = true;
			component.connectionString = 'postgresql://user:pass@host:5432/db';
			component.onConnectionStringChange(null);

			expect(component.fieldsOverridden).toBe(false);
		});

		it('should not modify db fields when connection string is empty', () => {
			const originalType = component.db.type;
			const originalHost = component.db.host;

			component.connectionString = '   ';
			component.onConnectionStringChange(null);

			expect(component.db.type).toBe(originalType);
			expect(component.db.host).toBe(originalHost);
		});

		it('should not modify db fields when connection string is invalid', () => {
			const originalType = component.db.type;
			const originalHost = component.db.host;

			component.connectionString = 'not-a-valid-connection-string';
			component.onConnectionStringChange(null);

			expect(component.db.type).toBe(originalType);
			expect(component.db.host).toBe(originalHost);
		});

		it('should use default port when port is not specified in connection string', () => {
			component.connectionString = 'postgresql://user:pass@host/db';
			component.onConnectionStringChange(null);

			expect(component.db.port).toBe('5432');
		});

		it('should handle URL-encoded username and password', () => {
			component.connectionString = 'postgresql://my%40user:p%40ss%23word@host:5432/db';
			component.onConnectionStringChange(null);

			expect(component.db.username).toBe('my@user');
			expect(component.db.password).toBe('p@ss#word');
		});

		it('should clear the connection string after successful parsing', () => {
			vi.useFakeTimers();
			component.connectionString = 'postgresql://user:pass@host:5432/db';
			component.onConnectionStringChange(null);

			vi.advanceTimersByTime(300);
			expect(component.connectionString).toBe('');
			vi.useRealTimers();
		});

		it('should store parsed connection string in parsedConnectionString', () => {
			const connStr = 'postgresql://user:pass@host:5432/db';
			component.connectionString = connStr;
			component.onConnectionStringChange(null);

			expect(component.parsedConnectionString).toBe(connStr);
		});
	});

	describe('clearAutoFilledField', () => {
		it('should remove the field from autoFilledFields', () => {
			component.autoFilledFields = new Set(['host', 'port', 'username']);
			component.clearAutoFilledField('host');

			expect(component.autoFilledFields.has('host')).toBe(false);
			expect(component.autoFilledFields.has('port')).toBe(true);
			expect(component.autoFilledFields.has('username')).toBe(true);
		});

		it('should set fieldsOverridden to true', () => {
			component.autoFilledFields = new Set(['host']);
			component.fieldsOverridden = false;

			component.clearAutoFilledField('host');

			expect(component.fieldsOverridden).toBe(true);
		});
	});
});
