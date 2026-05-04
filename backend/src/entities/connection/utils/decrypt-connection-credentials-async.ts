import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { ConnectionEntity } from '../connection.entity.js';

export async function decryptConnectionCredentialsAsync(connection: ConnectionEntity): Promise<void> {
	if (connection.isTestConnection) {
		const testConnectionsArray = Constants.getTestConnectionsArr();
		const foundTestConnectionByType = testConnectionsArray.find(
			(testConnection) => testConnection.type === connection.type,
		);
		if (foundTestConnectionByType) {
			connection.host = foundTestConnectionByType.host;
			connection.database = foundTestConnectionByType.database;
			connection.username = foundTestConnectionByType.username;
			connection.password = foundTestConnectionByType.password;
			connection.port = foundTestConnectionByType.port;
			connection.ssh = foundTestConnectionByType.ssh;
			connection.privateSSHKey = foundTestConnectionByType.privateSSHKey;
			connection.sshHost = foundTestConnectionByType.sshHost;
			connection.sshPort = foundTestConnectionByType.sshPort;
			connection.sshUsername = foundTestConnectionByType.sshUsername;
			connection.ssl = foundTestConnectionByType.ssl;
			connection.cert = foundTestConnectionByType.cert;
			connection.authSource = foundTestConnectionByType.authSource;
			connection.sid = foundTestConnectionByType.sid;
			connection.schema = foundTestConnectionByType.schema;
			connection.azure_encryption = foundTestConnectionByType.azure_encryption;
		}
	} else if (!isConnectionTypeAgent(connection.type)) {
		connection.host = await Encryptor.decryptDataAsync(connection.host);
		connection.database = await Encryptor.decryptDataAsync(connection.database);
		connection.password = await Encryptor.decryptDataAsync(connection.password);
		connection.username = await Encryptor.decryptDataAsync(connection.username);
		if (connection.authSource) {
			connection.authSource = await Encryptor.decryptDataAsync(connection.authSource);
		}
		if (connection.ssh) {
			connection.privateSSHKey = await Encryptor.decryptDataAsync(connection.privateSSHKey);
			connection.sshHost = await Encryptor.decryptDataAsync(connection.sshHost);
			connection.sshUsername = await Encryptor.decryptDataAsync(connection.sshUsername);
		}
		if (connection.ssl && connection.cert) {
			connection.cert = await Encryptor.decryptDataAsync(connection.cert);
		}
	}
	connection.credentialsDecrypted = true;
}

export async function decryptConnectionsCredentialsAsync(connections: Array<ConnectionEntity>): Promise<void> {
	await Promise.all(connections.map((connection) => decryptConnectionCredentialsAsync(connection)));
}
