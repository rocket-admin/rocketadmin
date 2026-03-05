import type { Meta, StoryObj } from '@storybook/angular';
import { RedisCredentialsFormComponent } from './redis-credentials-form.component';

const mockConnection = {
	id: null,
	database: '0',
	title: 'Test Redis Connection',
	host: 'localhost',
	port: '6379',
	sid: null,
	type: 'redis',
	username: '',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: '',
};

const meta: Meta<RedisCredentialsFormComponent> = {
	title: 'DB Credentials/Redis',
	component: RedisCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<RedisCredentialsFormComponent>;

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
