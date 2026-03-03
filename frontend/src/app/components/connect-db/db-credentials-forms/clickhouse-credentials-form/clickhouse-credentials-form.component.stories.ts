import type { Meta, StoryObj } from '@storybook/angular';
import { ClickhouseCredentialsFormComponent } from './clickhouse-credentials-form.component';

const mockConnection = {
	id: null,
	database: 'default',
	title: 'Test ClickHouse Connection',
	host: 'localhost',
	port: '8123',
	sid: null,
	type: 'clickhouse',
	username: 'default',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: '',
};

const meta: Meta<ClickhouseCredentialsFormComponent> = {
	title: 'DB Credentials/ClickHouse',
	component: ClickhouseCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<ClickhouseCredentialsFormComponent>;

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
