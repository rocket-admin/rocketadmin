import type { Meta, StoryObj } from '@storybook/angular';
import { MysqlCredentialsFormComponent } from './mysql-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test MySQL Connection',
	host: 'localhost',
	port: '3306',
	sid: null,
	type: 'mysql',
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

const meta: Meta<MysqlCredentialsFormComponent> = {
	title: 'DB Credentials/MySQL',
	component: MysqlCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<MysqlCredentialsFormComponent>;

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
