import type { Meta, StoryObj } from '@storybook/angular';
import { OracledbCredentialsFormComponent } from './oracledb-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test OracleDB Connection',
	host: 'localhost',
	port: '1521',
	sid: 'ORCL',
	type: 'oracledb',
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

const meta: Meta<OracledbCredentialsFormComponent> = {
	title: 'DB Credentials/OracleDB',
	component: OracledbCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<OracledbCredentialsFormComponent>;

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
