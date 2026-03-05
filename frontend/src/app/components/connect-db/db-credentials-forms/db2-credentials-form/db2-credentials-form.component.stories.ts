import type { Meta, StoryObj } from '@storybook/angular';
import { Db2CredentialsFormComponent } from './db2-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test IBM DB2 Connection',
	host: 'localhost',
	port: '50000',
	sid: null,
	type: 'ibmdb2',
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

const meta: Meta<Db2CredentialsFormComponent> = {
	title: 'DB Credentials/IBM DB2',
	component: Db2CredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<Db2CredentialsFormComponent>;

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
