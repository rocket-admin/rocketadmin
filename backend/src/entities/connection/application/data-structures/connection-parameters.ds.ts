import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export interface ConnectionParametersDs {
	title?: string;
	masterEncryption?: boolean;
	type: ConnectionTypesEnum;
	host?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	schema?: string;
	sid?: string;
	ssh?: boolean;
	privateSSHKey?: string;
	sshHost?: string;
	sshPort?: number;
	sshUsername?: string;
	ssl?: boolean;
	cert?: string;
	azure_encryption?: boolean;
	authSource?: string;
	dataCenter?: string;
}
