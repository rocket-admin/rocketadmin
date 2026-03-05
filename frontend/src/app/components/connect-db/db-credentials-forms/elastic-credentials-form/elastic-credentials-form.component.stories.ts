import type { Meta, StoryObj } from '@storybook/angular';
import { ElasticCredentialsFormComponent } from './elastic-credentials-form.component';

const mockConnection = {
	id: null,
	database: '',
	title: 'Test Elasticsearch Connection',
	host: 'localhost',
	port: '9200',
	sid: null,
	type: 'elasticsearch',
	username: 'elastic',
	password: '',
	ssh: false,
	ssl: false,
	cert: '',
	masterEncryption: false,
	azure_encryption: false,
	connectionType: 'direct',
	schema: '',
};

const meta: Meta<ElasticCredentialsFormComponent> = {
	title: 'DB Credentials/Elasticsearch',
	component: ElasticCredentialsFormComponent,
	args: {
		connection: mockConnection as any,
		readonly: false,
		submitting: false,
		masterKey: '',
		accessLevel: 'edit',
	},
};

export default meta;
type Story = StoryObj<ElasticCredentialsFormComponent>;

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
