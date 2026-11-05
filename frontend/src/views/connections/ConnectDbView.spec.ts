import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import DbConnectionConfirmDialog from '@/components/connections/DbConnectionConfirmDialog.vue';
import DbConnectionDeleteDialog from '@/components/connections/DbConnectionDeleteDialog.vue';
import DbConnectionIpAccessDialog from '@/components/connections/DbConnectionIpAccessDialog.vue';
import { AlertActionType, AlertType } from '@/models/alert';
import { type Connection, ConnectionType, DBtype } from '@/models/connection';
import { CONNECTION_INITIAL_STATE } from '@/stores/connections';
import { useNotificationsStore } from '@/stores/notifications';
import ConnectDbView from './ConnectDbView.vue';
import { byText, mountConnectionView } from './connectionsTestUtils';

const connections = vi.hoisted(() => ({
	connection: {} as Connection,
	connectionAccessLevel: 'edit' as string | null,
	connectionTitle: 'Rocketadmin',
	canEditConnection: true,
	testConnection: vi.fn(),
	createConnection: vi.fn(),
	updateConnection: vi.fn(),
}));
const user = vi.hoisted(() => ({ sendUserAction: vi.fn() }));
const dialogOpen = vi.hoisted(() => vi.fn());
const trackConnectionEvent = vi.hoisted(() => vi.fn());

vi.mock('@/stores/connections', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/stores/connections')>()),
	useConnectionsStore: () => reactive(connections),
}));
vi.mock('@/stores/user', () => ({ useUserStore: () => user }));
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ open: dialogOpen }) }));
vi.mock('@/components/connections/analytics', () => ({ trackConnectionEvent }));

const CONNECTION_ID = '9d5f6d0f-9516-4598-91c4-e4fe6330b4d4';

const connectionCredsApp: Connection = {
	title: 'Test connection via SSH tunnel to mySQL',
	masterEncryption: false,
	type: DBtype.MySQL,
	host: 'database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com',
	port: '3306',
	username: 'admin',
	database: 'testDB',
	schema: undefined,
	sid: null,
	id: CONNECTION_ID,
	ssh: true,
	sshHost: '3.134.99.192',
	sshPort: '22',
	sshUsername: 'ubuntu',
	ssl: false,
	cert: '',
	connectionType: ConnectionType.Direct,
	azure_encryption: false,
	signing_key: '',
};

/** What useDialog().open() hands back: `afterClosed` resolves with `result`. */
function dialogResult(result?: string) {
	return { id: 1, close: vi.fn(), afterClosed: () => Promise.resolve(result) };
}

const mountNew = (url = '/connect-db') => mountConnectionView(ConnectDbView, '/connect-db', url);
const mountEdit = () => mountConnectionView(ConnectDbView, '/edit-db/:connectionId', `/edit-db/${CONNECTION_ID}`);

const input = (wrapper: VueWrapper, testid: string) => wrapper.find(`[data-testid="${testid}"]`);
const inputValue = (wrapper: VueWrapper, testid: string) => (input(wrapper, testid).element as HTMLInputElement).value;

async function fillDirectCredentials(wrapper: VueWrapper) {
	await input(wrapper, 'connection-hostname-input').setValue('database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com');
	await input(wrapper, 'connection-username-input').setValue('admin');
	await input(wrapper, 'connection-password-input').setValue('secret');
	await input(wrapper, 'connection-database-input').setValue('testDB');
}

async function submit(wrapper: VueWrapper) {
	await wrapper.find('form').trigger('submit');
	await flushPromises();
}

describe('ConnectDbView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connections.connection = { ...CONNECTION_INITIAL_STATE };
		connections.connectionAccessLevel = 'edit';
		connections.connectionTitle = 'Rocketadmin';
		connections.canEditConnection = true;
		dialogOpen.mockReturnValue(dialogResult());
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	describe('a new connection', () => {
		it('starts with the MySQL form, reports the unfinished creation and sets the page title', async () => {
			const { wrapper } = await mountNew();

			expect(wrapper.find('h1').text()).toBe('Connect database');
			expect(inputValue(wrapper, 'connection-port-input')).toBe('3306');
			expect(input(wrapper, 'connection-hostname-input').exists()).toBe(true);
			expect(user.sendUserAction).toHaveBeenCalledWith('CONNECTION_CREATION_NOT_FINISHED');
			expect(document.title).toBe('Add new database | Rocketadmin');
			wrapper.unmount();
		});

		it('takes the database type from ?type and sets its default port', async () => {
			const { wrapper } = await mountNew('/connect-db?type=oracledb');

			expect(inputValue(wrapper, 'connection-port-input')).toBe('1521');
			expect(input(wrapper, 'connection-sid-input').exists()).toBe(true);
			wrapper.unmount();
		});

		it('sets 1521 port when the Oracle type is selected', async () => {
			const { wrapper } = await mountNew();
			const oracleIndex = ['mysql', 'postgres', 'mongodb', 'dynamodb', 'cassandra', 'oracledb'].indexOf('oracledb');

			await wrapper.find('select[name="dbtype"]').setValue(String(oracleIndex));

			expect(inputValue(wrapper, 'connection-port-input')).toBe('1521');
			expect(input(wrapper, 'connection-sid-input').exists()).toBe(true);
			expect(trackConnectionEvent).toHaveBeenCalledWith('Connection creds add: db type is selected', {
				dbType: DBtype.Oracle,
			});
			wrapper.unmount();
		});

		it('shows a success snackbar when the manual test passes', async () => {
			connections.testConnection.mockResolvedValue({ result: true, message: '' });
			const { wrapper } = await mountNew();
			const notifications = useNotificationsStore();
			const snackbar = vi.spyOn(notifications, 'showSuccessSnackbar');
			const dismiss = vi.spyOn(notifications, 'dismissAlert');

			await byText(wrapper, 'Test connection').trigger('click');
			await flushPromises();

			expect(connections.testConnection).toHaveBeenCalledWith(null, expect.objectContaining({ type: DBtype.MySQL }));
			expect(dismiss).toHaveBeenCalled();
			expect(snackbar).toHaveBeenCalledWith('Connection is live');
			wrapper.unmount();
		});

		it('shows an error alert with a Dismiss action when the manual test fails', async () => {
			connections.testConnection.mockResolvedValue({ result: false, message: 'Error in hostname.' });
			const { wrapper } = await mountNew();
			const showAlert = vi.spyOn(useNotificationsStore(), 'showAlert');

			await byText(wrapper, 'Test connection').trigger('click');
			await flushPromises();

			expect(showAlert).toHaveBeenCalledWith(AlertType.Error, 'Error in hostname.', [
				expect.objectContaining({ type: AlertActionType.Button, caption: 'Dismiss' }),
			]);
			wrapper.unmount();
		});

		it('asks for IP access, tests and adds a direct connection, then opens auto-configure', async () => {
			dialogOpen.mockReturnValue(dialogResult('confirmed'));
			connections.testConnection.mockResolvedValue({ result: true, message: '' });
			connections.createConnection.mockResolvedValue({ id: 'new-id' });
			const { wrapper, router } = await mountNew();

			await fillDirectCredentials(wrapper);
			await submit(wrapper);

			expect(dialogOpen).toHaveBeenCalledWith(DbConnectionIpAccessDialog, {
				data: {
					db: expect.objectContaining({ host: 'database-2.cvfuxe8nltiq.us-east-2.rds.amazonaws.com' }),
					provider: 'amazon',
				},
			});
			expect(connections.testConnection).toHaveBeenCalled();
			expect(connections.createConnection).toHaveBeenCalledWith(
				expect.objectContaining({ username: 'admin', masterEncryption: false }),
				'',
			);
			expect(router.currentRoute.value.path).toBe('/auto-configure/new-id');
			expect(trackConnectionEvent).toHaveBeenCalledWith('Connect DB: connection is added successfully', {
				connectionType: ConnectionType.Direct,
				dbType: DBtype.MySQL,
			});
			wrapper.unmount();
		});

		it('does nothing when the IP-access dialog is dismissed', async () => {
			const { wrapper } = await mountNew();

			await fillDirectCredentials(wrapper);
			await submit(wrapper);

			expect(dialogOpen).toHaveBeenCalledTimes(1);
			expect(connections.testConnection).not.toHaveBeenCalled();
			expect(connections.createConnection).not.toHaveBeenCalled();
			wrapper.unmount();
		});

		it('opens the connection-error dialog when the automatic test fails', async () => {
			dialogOpen.mockReturnValueOnce(dialogResult('confirmed'));
			connections.testConnection.mockResolvedValue({ result: false, message: 'Hostname is invalid' });
			const { wrapper } = await mountNew();

			await fillDirectCredentials(wrapper);
			await submit(wrapper);

			expect(connections.createConnection).not.toHaveBeenCalled();
			expect(dialogOpen).toHaveBeenLastCalledWith(DbConnectionConfirmDialog, {
				data: {
					dbCreds: expect.objectContaining({ username: 'admin' }),
					provider: 'amazon',
					masterKey: null,
					errorMessage: 'Hostname is invalid',
				},
			});
			expect(byText(wrapper, 'Add').attributes('disabled')).toBeUndefined();
			wrapper.unmount();
		});

		it('skips the IP-access dialog for DynamoDB', async () => {
			connections.testConnection.mockResolvedValue({ result: true, message: '' });
			connections.createConnection.mockResolvedValue({ id: 'dynamo-id' });
			const { wrapper } = await mountNew('/connect-db?type=dynamodb');

			await input(wrapper, 'connection-hostname-input').setValue('https://dynamodb.us-east-2.amazonaws.com');
			await submit(wrapper);

			expect(dialogOpen).not.toHaveBeenCalled();
			expect(connections.testConnection).toHaveBeenCalled();
			expect(connections.createConnection).toHaveBeenCalled();
			wrapper.unmount();
		});

		it('adds an agent connection without testing it and shows its token', async () => {
			connections.createConnection.mockResolvedValue({ id: CONNECTION_ID, token: '1234-abcd-0987' });
			const { wrapper } = await mountNew();

			await wrapper.findAll('[data-testid="connection-type-toggle"] input')[1]?.setValue(true);
			expect(input(wrapper, 'connection-agent-dockerhub-link').exists()).toBe(true);
			expect(input(wrapper, 'connection-hostname-input').exists()).toBe(false);

			await input(wrapper, 'connection-title-input').setValue('Agent connection');
			await submit(wrapper);

			expect(connections.testConnection).not.toHaveBeenCalled();
			expect(connections.createConnection).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Agent connection', connectionType: ConnectionType.Agent }),
				'',
			);
			expect(inputValue(wrapper, 'connection-agent-token-input')).toBe('1234-abcd-0987');
			expect(input(wrapper, 'add-connection-actions-open-dashboard-link').attributes('href')).toBe(
				`/dashboard/${CONNECTION_ID}`,
			);
			expect(input(wrapper, 'add-connection-actions-add-button').exists()).toBe(false);
			wrapper.unmount();
		});

		it('switches to an agent connection from the internal-IP hostname error', async () => {
			const { wrapper } = await mountNew();

			const host = input(wrapper, 'connection-hostname-input');
			await host.setValue('localhost');
			await host.trigger('blur');
			expect(wrapper.text()).toContain('To connect a database to an internal IP');

			await input(wrapper, 'connection-switch-to-agent-button').trigger('click');

			expect(input(wrapper, 'connection-agent-dockerhub-link').exists()).toBe(true);
			wrapper.unmount();
		});
	});

	describe('an existing connection', () => {
		beforeEach(() => {
			connections.connection = { ...connectionCredsApp };
			connections.connectionTitle = connectionCredsApp.title;
		});

		it('shows the saved credentials under "Edit credentials"', async () => {
			const { wrapper } = await mountEdit();

			expect(wrapper.find('h1').text()).toBe('Edit credentials');
			expect(document.title).toBe(`Credentials — ${connectionCredsApp.title} | Rocketadmin`);
			expect(inputValue(wrapper, 'connection-hostname-input')).toBe(connectionCredsApp.host);
			expect(inputValue(wrapper, 'connection-ssh-host-input')).toBe('3.134.99.192');
			expect(input(wrapper, 'connection-string-input').exists()).toBe(false);
			expect(user.sendUserAction).not.toHaveBeenCalled();
			wrapper.unmount();
		});

		it('takes over the connection once the store has loaded it', async () => {
			connections.connection = { ...CONNECTION_INITIAL_STATE };
			const { wrapper } = await mountEdit();

			reactive(connections).connection = { ...connectionCredsApp };
			await flushPromises();

			expect(inputValue(wrapper, 'connection-hostname-input')).toBe(connectionCredsApp.host);
			wrapper.unmount();
		});

		it('tests and updates a direct connection, then opens its dashboard', async () => {
			connections.testConnection.mockResolvedValue({ result: true, message: '' });
			connections.updateConnection.mockResolvedValue({ connection: { id: CONNECTION_ID } });
			const { wrapper, router } = await mountEdit();

			await submit(wrapper);

			expect(connections.testConnection).toHaveBeenCalledWith(
				CONNECTION_ID,
				expect.objectContaining({ id: CONNECTION_ID }),
			);
			expect(connections.updateConnection).toHaveBeenCalledWith(expect.objectContaining({ id: CONNECTION_ID }), '');
			expect(router.currentRoute.value.path).toBe(`/dashboard/${CONNECTION_ID}`);
			wrapper.unmount();
		});

		it('updates an agent connection even when the test fails, and shows its token', async () => {
			connections.connection = { ...connectionCredsApp, connectionType: ConnectionType.Agent, type: DBtype.Oracle };
			connections.testConnection.mockResolvedValue({ result: false, message: 'no agent' });
			connections.updateConnection.mockResolvedValue({ connection: { id: CONNECTION_ID, token: '1234-abcd-0987' } });
			const { wrapper } = await mountEdit();

			await submit(wrapper);

			expect(connections.updateConnection).toHaveBeenCalled();
			expect(inputValue(wrapper, 'connection-agent-token-input')).toBe('1234-abcd-0987');
			expect(input(wrapper, 'edit-connection-actions-open-dashboard-link').exists()).toBe(true);
			wrapper.unmount();
		});

		it('opens the connection-error dialog with the provider and master key when the test fails', async () => {
			connections.testConnection.mockResolvedValue({ result: false, message: 'Hostname is invalid' });
			const { wrapper } = await mountEdit();

			await input(wrapper, 'connection-master-encryption-toggle').setValue(true);
			await submit(wrapper);

			expect(connections.updateConnection).not.toHaveBeenCalled();
			expect(dialogOpen).toHaveBeenCalledWith(DbConnectionConfirmDialog, {
				data: {
					dbCreds: expect.objectContaining({ id: CONNECTION_ID, masterEncryption: true }),
					provider: 'amazon',
					masterKey: expect.any(String),
					errorMessage: 'Hostname is invalid',
				},
			});
			wrapper.unmount();
		});

		it('opens the delete dialog with the connection', async () => {
			const { wrapper } = await mountEdit();

			await input(wrapper, 'edit-connection-actions-delete-button').trigger('click');

			expect(dialogOpen).toHaveBeenCalledWith(DbConnectionDeleteDialog, {
				data: expect.objectContaining({ id: CONNECTION_ID, title: connectionCredsApp.title }),
			});
			wrapper.unmount();
		});

		it('makes the credentials readonly for readonly users', async () => {
			connections.connectionAccessLevel = 'readonly';
			const { wrapper } = await mountEdit();

			expect(input(wrapper, 'connection-hostname-input').attributes('readonly')).toBeDefined();
			expect(input(wrapper, 'connection-title-input').attributes('readonly')).toBeDefined();
			wrapper.unmount();
		});

		it('offers only "Create your own" and Delete for a test connection', async () => {
			connections.connection = { ...connectionCredsApp, isTestConnection: true };
			const { wrapper } = await mountEdit();

			expect(wrapper.text()).toContain('You cannot edit test connection.');
			expect(input(wrapper, 'test-connection-actions-create-own-link').attributes('href')).toBe('/connect-db');
			expect(input(wrapper, 'edit-connection-actions-edit-button').exists()).toBe(false);
			wrapper.unmount();
		});
	});

	describe('connection string', () => {
		async function paste(wrapper: VueWrapper, value: string) {
			await input(wrapper, 'connection-string-input').setValue(value);
		}

		it('parses a PostgreSQL connection string into the fields', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, 'postgresql://myuser:mypass@db.example.com:5432/mydb');

			expect(inputValue(wrapper, 'connection-hostname-input')).toBe('db.example.com');
			expect(inputValue(wrapper, 'connection-port-input')).toBe('5432');
			expect(inputValue(wrapper, 'connection-username-input')).toBe('myuser');
			expect(inputValue(wrapper, 'connection-password-input')).toBe('mypass');
			expect(inputValue(wrapper, 'connection-database-input')).toBe('mydb');
			// The PostgreSQL form, which has a schema field.
			expect(input(wrapper, 'connection-schema-input').exists()).toBe(true);
			expect(wrapper.text()).toContain('Parsed:');
			expect(wrapper.text()).toContain('postgresql://myuser:mypass@db.example.com:5432/mydb');
			wrapper.unmount();
		});

		it('parses a MongoDB connection string with authSource', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, 'mongodb://admin:pass123@mongo.host.com:27017/mydb?authSource=admin');

			expect(inputValue(wrapper, 'connection-port-input')).toBe('27017');
			expect(inputValue(wrapper, 'connection-auth-source-input')).toBe('admin');
			const authField = input(wrapper, 'connection-auth-source-input').element.closest('.credentials-field');
			expect(authField?.classList.contains('credentials-field--autofilled')).toBe(true);
			wrapper.unmount();
		});

		it('marks every parsed field as autofilled', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, 'postgresql://user:pass@host.example.com:5432/db');

			for (const testid of [
				'connection-hostname-input',
				'connection-port-input',
				'connection-username-input',
				'connection-password-input',
				'connection-database-input',
			]) {
				const field = input(wrapper, testid).element.closest('.credentials-field');
				expect(field?.classList.contains('credentials-field--autofilled'), testid).toBe(true);
			}
			wrapper.unmount();
		});

		it('turns SSL on for sslmode=require and fills the schema option', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, 'postgresql://user:pass@host.example.com:5432/db?sslmode=require&schema=my_schema');

			const ssl = input(wrapper, 'connection-ssl-checkbox').element as HTMLInputElement;
			expect(ssl.checked).toBe(true);
			expect(inputValue(wrapper, 'connection-schema-input')).toBe('my_schema');
			wrapper.unmount();
		});

		it('uses the default port and decodes URL-encoded credentials', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, 'postgresql://my%40user:p%40ss%23word@host.example.com/db');

			expect(inputValue(wrapper, 'connection-port-input')).toBe('5432');
			expect(inputValue(wrapper, 'connection-username-input')).toBe('my@user');
			expect(inputValue(wrapper, 'connection-password-input')).toBe('p@ss#word');
			wrapper.unmount();
		});

		it('leaves the fields alone for a blank or invalid string, and shows the error once left', async () => {
			const { wrapper } = await mountNew();

			await paste(wrapper, '   ');
			await paste(wrapper, 'not-a-valid-connection-string');
			await input(wrapper, 'connection-string-input').trigger('blur');

			expect(inputValue(wrapper, 'connection-port-input')).toBe('3306');
			expect(inputValue(wrapper, 'connection-hostname-input')).toBe('');
			expect(wrapper.text()).toContain('Invalid format. Expected: scheme://user:password@host:port/database');
			wrapper.unmount();
		});

		it('clears the connection string shortly after parsing it', async () => {
			const { wrapper } = await mountNew();
			vi.useFakeTimers();
			try {
				await paste(wrapper, 'postgresql://user:pass@host.example.com:5432/db');
				vi.advanceTimersByTime(300);
				await flushPromises();
				expect(inputValue(wrapper, 'connection-string-input')).toBe('');
			} finally {
				vi.useRealTimers();
				wrapper.unmount();
			}
		});

		it('drops the autofilled look of an edited field and says the fields now win', async () => {
			const { wrapper } = await mountNew();
			await paste(wrapper, 'postgresql://user:pass@host.example.com:5432/db');

			await input(wrapper, 'connection-hostname-input').trigger('change');

			const host = input(wrapper, 'connection-hostname-input').element.closest('.credentials-field');
			const port = input(wrapper, 'connection-port-input').element.closest('.credentials-field');
			expect(host?.classList.contains('credentials-field--autofilled')).toBe(false);
			expect(port?.classList.contains('credentials-field--autofilled')).toBe(true);
			expect(wrapper.text()).toContain('Fields are now the source of truth');

			await paste(wrapper, 'postgresql://user:pass@other.example.com:5432/db');
			expect(wrapper.text()).not.toContain('Fields are now the source of truth');
			wrapper.unmount();
		});
	});
});
