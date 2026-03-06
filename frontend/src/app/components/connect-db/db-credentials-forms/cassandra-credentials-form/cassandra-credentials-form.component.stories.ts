import type { Meta, StoryObj } from '@storybook/angular';
import { CassandraCredentialsFormComponent } from './cassandra-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_keyspace',
	title: 'Test Cassandra Connection',
	host: 'localhost',
	port: '9042',
	sid: null,
	type: 'cassandra',
	username: 'admin',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: '',
};

const meta: Meta<CassandraCredentialsFormComponent> = {
	title: 'DB Credentials/Cassandra',
	component: CassandraCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<CassandraCredentialsFormComponent>;

export const Default: Story = {};

export const Readonly: Story = {
	args: {
		readonly: true,
	},
};

export const Submitting: Story = {
	args: {
		submitting: true,
	},
};
