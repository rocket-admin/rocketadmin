import type { Meta, StoryObj } from '@storybook/angular';
import { MongodbCredentialsFormComponent } from './mongodb-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'test_db',
	title: 'Test MongoDB Connection',
	host: 'localhost',
	port: '27017',
	sid: null,
	type: 'mongodb',
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

const meta: Meta<MongodbCredentialsFormComponent> = {
	title: 'DB Credentials/MongoDB',
	component: MongodbCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<MongodbCredentialsFormComponent>;

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
