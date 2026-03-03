import type { Meta, StoryObj } from '@storybook/angular';
import { MssqlCredentialsFormComponent } from './mssql-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test MSSQL Connection',
	host: 'localhost',
	port: '1433',
	sid: null,
	type: 'mssql',
	username: 'sa',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: 'dbo',
};

const meta: Meta<MssqlCredentialsFormComponent> = {
	title: 'DB Credentials/MSSQL',
	component: MssqlCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<MssqlCredentialsFormComponent>;

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
