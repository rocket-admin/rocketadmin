// The fields most credentials forms share, as CredentialsTextField props: `<CredentialsTextField
// v-bind="PORT_FIELD" />`. Forms override single props (label, span) next to the v-bind.
import type { CredentialsTextKey } from './credentialsForm';

export interface TextFieldPreset {
	field: CredentialsTextKey;
	label: string;
	event: string;
	name?: string;
	span?: 1 | 2 | 3 | 'full';
	type?: 'text' | 'number' | 'password';
	required?: boolean;
	requiredError?: string;
	autofill?: string;
	testid?: string;
}

export const PORT_FIELD: TextFieldPreset = {
	field: 'port',
	type: 'number',
	label: 'Port',
	event: 'port',
	span: 1,
	required: true,
	requiredError: 'Port should not be empty',
	autofill: 'port',
	testid: 'connection-port-input',
};

export const USERNAME_FIELD: TextFieldPreset = {
	field: 'username',
	label: 'Username',
	event: 'username',
	span: 2,
	required: true,
	requiredError: 'Username should not be empty',
	autofill: 'username',
	testid: 'connection-username-input',
};

export const DATABASE_FIELD: TextFieldPreset = {
	field: 'database',
	label: 'Database Name',
	event: 'database name',
	span: 'full',
	required: true,
	requiredError: 'Name should not be empty',
	autofill: 'database',
	testid: 'connection-database-input',
};

export const SCHEMA_FIELD: TextFieldPreset = {
	field: 'schema',
	label: 'Schema',
	event: 'database schema',
	span: 2,
	requiredError: 'Name should not be empty',
	autofill: 'schema',
	testid: 'connection-schema-input',
};
