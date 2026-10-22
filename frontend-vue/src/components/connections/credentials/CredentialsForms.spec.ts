import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Component, reactive } from 'vue';
import { type Connection, DBtype } from '@/models/connection';
import { AccessLevel } from '@/models/user';
import { CONNECTION_INITIAL_STATE } from '@/stores/connections';
import CassandraCredentialsForm from './CassandraCredentialsForm.vue';
import type { CredentialsFormProps } from './credentialsForm';
import DynamodbCredentialsForm from './DynamodbCredentialsForm.vue';
import { CREDENTIALS_FORMS } from './index';
import MongodbCredentialsForm from './MongodbCredentialsForm.vue';
import MssqlCredentialsForm from './MssqlCredentialsForm.vue';
import MysqlCredentialsForm from './MysqlCredentialsForm.vue';

const trackConnectionEvent = vi.hoisted(() => vi.fn());
vi.mock('../analytics', () => ({ trackConnectionEvent }));

function draft(overrides: Partial<Connection> = {}): Connection {
	return reactive<Connection>({ ...CONNECTION_INITIAL_STATE, ...overrides });
}

function mountForm(form: Component, props: Partial<CredentialsFormProps> = {}) {
	const connection = props.connection ?? draft();
	const wrapper = mount(form, {
		props: { submitting: false, readonly: false, accessLevel: AccessLevel.Edit, ...props, connection },
	});
	return { wrapper, connection };
}

const byTestId = (wrapper: VueWrapper, testid: string) => wrapper.find(`[data-testid="${testid}"]`);
const fieldOf = (wrapper: VueWrapper, testid: string) =>
	byTestId(wrapper, testid).element.closest('.credentials-field');

describe('credentials forms', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('has a form for every database type', () => {
		expect(Object.keys(CREDENTIALS_FORMS).sort()).toEqual(Object.values(DBtype).sort());
	});

	it.each([
		[DBtype.MySQL, ['hostname', 'port', 'username', 'password', 'database'], ['schema']],
		[DBtype.Postgres, ['hostname', 'port', 'username', 'password', 'database', 'schema'], []],
		[DBtype.Oracle, ['hostname', 'port', 'username', 'password', 'database', 'schema', 'sid'], []],
		[DBtype.MSSQL, ['hostname', 'port', 'username', 'password', 'database', 'schema'], []],
		[DBtype.ClickHouse, ['hostname', 'port', 'username', 'password', 'database'], ['schema']],
		[DBtype.Mongo, ['hostname', 'port', 'username', 'password', 'database', 'auth-source'], ['schema']],
		[DBtype.Cassandra, ['hostname', 'port', 'username', 'password', 'database', 'data-center'], ['schema']],
		[DBtype.Redis, ['hostname', 'port', 'password', 'username', 'database'], ['schema']],
		[DBtype.Elasticsearch, ['hostname', 'port', 'username', 'password', 'database'], ['schema']],
		[DBtype.Dynamo, ['hostname', 'username', 'password'], ['port', 'database', 'ssh-checkbox']],
	])('%s renders its fields', (type, present, absent) => {
		const { wrapper } = mountForm(CREDENTIALS_FORMS[type]);

		for (const name of present) {
			expect(wrapper.find(`[data-testid="connection-${name}-input"]`).exists(), name).toBe(true);
		}
		for (const name of absent) {
			expect(wrapper.find(`[data-testid^="connection-${name}"]`).exists(), name).toBe(false);
		}
		wrapper.unmount();
	});

	it('writes the typed values into the connection', async () => {
		const { wrapper, connection } = mountForm(MysqlCredentialsForm);

		await byTestId(wrapper, 'connection-hostname-input').setValue('db.example.com');
		await byTestId(wrapper, 'connection-port-input').setValue('3307');
		await byTestId(wrapper, 'connection-username-input').setValue('admin');
		await byTestId(wrapper, 'connection-database-input').setValue('shop');

		expect(connection).toMatchObject({ host: 'db.example.com', port: '3307', username: 'admin', database: 'shop' });
		wrapper.unmount();
	});

	it('requires the password for a new connection', () => {
		const { wrapper } = mountForm(MysqlCredentialsForm);

		expect(byTestId(wrapper, 'connection-password-input').attributes('required')).toBeDefined();
		wrapper.unmount();
	});

	it('lets a saved connection keep its password until the hostname changes', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm, {
			connection: draft({ id: 'conn-1', host: 'db.example.com' }),
		});
		const password = () => byTestId(wrapper, 'connection-password-input');

		expect(password().attributes('required')).toBeUndefined();
		expect(wrapper.text()).toContain('To keep password the same keep this field blank');

		const host = byTestId(wrapper, 'connection-hostname-input');
		await host.setValue('db2.example.com');
		await host.trigger('blur');

		expect(password().attributes('required')).toBeDefined();
		expect(wrapper.text()).toContain('Password needed due to hostname/port change');
		wrapper.unmount();
	});

	it('shows "should not be empty" errors once a required field is left, or after a submit', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm);

		expect(wrapper.text()).not.toContain('Port should not be empty');
		await byTestId(wrapper, 'connection-port-input').setValue('');
		await byTestId(wrapper, 'connection-port-input').trigger('blur');
		expect(wrapper.text()).toContain('Port should not be empty');
		expect(wrapper.text()).not.toContain('Username should not be empty');

		await wrapper.setProps({ submitted: true });
		expect(wrapper.text()).toContain('Username should not be empty');
		expect(wrapper.text()).toContain('Name should not be empty');
		wrapper.unmount();
	});

	it('ends Cassandra messages with a period', () => {
		const { wrapper } = mountForm(CassandraCredentialsForm, { submitted: true, connection: draft({ port: '' }) });

		expect(wrapper.text()).toContain('Port should not be empty.');
		expect(wrapper.text()).toContain('Username should not be empty.');
		wrapper.unmount();
	});

	it('validates the hostname', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm);
		const host = byTestId(wrapper, 'connection-hostname-input');

		await host.setValue('not a host');
		await host.trigger('blur');
		expect(wrapper.text()).toContain('Hostname is invalid');

		await host.setValue('db.example.com');
		expect(wrapper.text()).not.toContain('Hostname is invalid');
		wrapper.unmount();
	});

	it('offers a tunnel guide and the agent for an internal hostname', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm);
		const host = byTestId(wrapper, 'connection-hostname-input');

		await host.setValue('192.168.0.10');
		await host.trigger('blur');
		await byTestId(wrapper, 'connection-switch-to-agent-button').trigger('click');

		expect(wrapper.text()).toContain('To connect a database to an internal IP');
		expect(wrapper.find('a[href*="create_pinggy"]').exists()).toBe(true);
		expect(wrapper.emitted('switchToAgent')).toHaveLength(1);
		wrapper.unmount();
	});

	it('wants https:// for DynamoDB and accepts mongodb+srv:// for MongoDB', () => {
		const dynamo = mountForm(DynamodbCredentialsForm, {
			submitted: true,
			connection: draft({ host: 'dynamodb.aws.com' }),
		});
		expect(dynamo.wrapper.text()).toContain('Hostname must start with "https://"');
		expect(dynamo.wrapper.find('a[href*="ddb_region"]').exists()).toBe(true);
		dynamo.wrapper.unmount();

		const mongo = mountForm(MongodbCredentialsForm, {
			submitted: true,
			connection: draft({ host: 'mongodb+srv://cluster0.abcde.mongodb.net' }),
		});
		expect(mongo.wrapper.text()).not.toContain('Hostname is invalid');
		mongo.wrapper.unmount();
	});

	it('shows the autofilled look and reports an edited autofilled field', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm, { autoFilledFields: new Set(['host', 'port']) });

		expect(fieldOf(wrapper, 'connection-hostname-input')?.classList).toContain('credentials-field--autofilled');
		expect(fieldOf(wrapper, 'connection-username-input')?.classList).not.toContain('credentials-field--autofilled');

		await byTestId(wrapper, 'connection-port-input').trigger('change');

		expect(wrapper.emitted('fieldChange')).toEqual([['port']]);
		expect(trackConnectionEvent).toHaveBeenCalledWith('Connection creds add: port is edited', undefined);
		wrapper.unmount();
	});

	it("keeps MongoDB's auth database autofilled when it is edited", async () => {
		const { wrapper } = mountForm(MongodbCredentialsForm, { autoFilledFields: new Set(['authSource']) });

		await byTestId(wrapper, 'connection-auth-source-input').trigger('change');

		expect(wrapper.emitted('fieldChange')).toBeUndefined();
		wrapper.unmount();
	});

	it('shows the SSH fields once the tunnel is on; the key is required only for a new connection', async () => {
		const { wrapper, connection } = mountForm(MysqlCredentialsForm);
		expect(byTestId(wrapper, 'connection-ssh-host-input').exists()).toBe(false);

		await byTestId(wrapper, 'connection-ssh-checkbox').setValue(true);

		expect(connection.ssh).toBe(true);
		expect(byTestId(wrapper, 'connection-ssh-host-input').exists()).toBe(true);
		expect(byTestId(wrapper, 'connection-ssh-key-textarea').attributes('required')).toBeDefined();
		expect(trackConnectionEvent).toHaveBeenCalledWith('Connection creds add: SSH is switched', { enable: true });
		wrapper.unmount();

		const saved = mountForm(MysqlCredentialsForm, { connection: draft({ id: 'conn-1', ssh: true }) });
		expect(byTestId(saved.wrapper, 'connection-ssh-key-textarea').attributes('required')).toBeUndefined();
		saved.wrapper.unmount();
	});

	it('requires the SSL certificate, except for Redis', () => {
		const mysql = mountForm(MysqlCredentialsForm, { connection: draft({ ssl: true }) });
		expect(byTestId(mysql.wrapper, 'connection-ssl-certificate-textarea').attributes('required')).toBeDefined();
		mysql.wrapper.unmount();

		const redis = mountForm(CREDENTIALS_FORMS[DBtype.Redis], { connection: draft({ ssl: true }) });
		expect(byTestId(redis.wrapper, 'connection-ssl-certificate-textarea').attributes('required')).toBeUndefined();
		redis.wrapper.unmount();
	});

	it("toggles SQL Server's encryption", async () => {
		const { wrapper, connection } = mountForm(MssqlCredentialsForm);

		await byTestId(wrapper, 'connection-ssl-encryption-checkbox').setValue(true);

		expect(connection.azure_encryption).toBe(true);
		wrapper.unmount();
	});

	it('makes the fields readonly; SSH fields follow the access level only', () => {
		const { wrapper } = mountForm(MysqlCredentialsForm, {
			readonly: true,
			accessLevel: AccessLevel.Edit,
			connection: draft({ id: 'conn-1', ssh: true }),
		});

		expect(byTestId(wrapper, 'connection-hostname-input').attributes('readonly')).toBeDefined();
		expect(byTestId(wrapper, 'connection-ssh-host-input').attributes('readonly')).toBeUndefined();
		wrapper.unmount();

		const readonlyUser = mountForm(MysqlCredentialsForm, {
			readonly: true,
			accessLevel: AccessLevel.Readonly,
			connection: draft({ id: 'conn-1', ssh: true }),
		});
		expect(byTestId(readonlyUser.wrapper, 'connection-ssh-host-input').attributes('readonly')).toBeDefined();
		expect(byTestId(readonlyUser.wrapper, 'connection-master-encryption-toggle').attributes('disabled')).toBeDefined();
		readonlyUser.wrapper.unmount();
	});

	it('disables the fields while submitting', () => {
		const { wrapper } = mountForm(MysqlCredentialsForm, { submitting: true });

		expect(byTestId(wrapper, 'connection-hostname-input').attributes('disabled')).toBeDefined();
		expect(byTestId(wrapper, 'connection-password-input').attributes('disabled')).toBeDefined();
		wrapper.unmount();
	});

	it('emits the generated master key', async () => {
		const { wrapper } = mountForm(MysqlCredentialsForm);

		await byTestId(wrapper, 'connection-master-encryption-toggle').setValue(true);
		await flushPromises();

		const [[key]] = wrapper.emitted('masterKeyChange') as [[string]];
		expect(key).toMatch(/^[A-Za-z0-9+/]{43}=$/);
		wrapper.unmount();
	});
});
