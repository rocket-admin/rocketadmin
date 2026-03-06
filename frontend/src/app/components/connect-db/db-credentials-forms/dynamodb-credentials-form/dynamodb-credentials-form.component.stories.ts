import type { Meta, StoryObj } from '@storybook/angular';
import { DynamodbCredentialsFormComponent } from './dynamodb-credentials-form.component';

const mockConnection = {
	id: null,
	database: '',
	title: 'Test DynamoDB Connection',
	host: 'dynamodb.us-east-1.amazonaws.com',
	port: '443',
	sid: null,
	type: 'dynamodb',
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

const meta: Meta<DynamodbCredentialsFormComponent> = {
	title: 'DB Credentials/DynamoDB',
	component: DynamodbCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<DynamodbCredentialsFormComponent>;

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
