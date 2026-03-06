import type { Meta, StoryObj } from '@storybook/angular';
import { PostgresCredentialsFormComponent } from './postgres-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test PostgreSQL Connection',
	host: 'localhost',
	port: '5432',
	sid: null,
	type: 'postgres',
	username: 'admin',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: 'public',
};

const meta: Meta<PostgresCredentialsFormComponent> = {
	title: 'DB Credentials/PostgreSQL',
	component: PostgresCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<PostgresCredentialsFormComponent>;

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
