import { ConnectionEntity } from '../connection.entity.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';

export function buildCreatedConnectionDs(
  connection: ConnectionEntity,
  token: string,
  masterPwd: string,
): CreatedConnectionDTO {
  if (connection.masterEncryption && masterPwd) {
    connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
  }
  return {
    author: connection.author?.id ? connection.author.id : undefined,
    azure_encryption: connection.azure_encryption,
    cert: connection.cert,
    createdAt: connection.createdAt,
    database: connection.database,
    host: connection.host,
    id: connection.id,
    isTestConnection: connection.isTestConnection,
    masterEncryption: connection.masterEncryption,
    port: connection.port,
    schema: connection.schema,
    sid: connection.sid,
    ssh: connection.ssh,
    sshHost: connection.sshHost,
    sshPort: connection.sshPort,
    sshUsername: connection.sshUsername,
    ssl: connection.ssl,
    title: connection.title,
    token: token ? token : null,
    type: connection.type,
    updatedAt: connection.updatedAt,
    username: connection.username,
    authSource: connection.authSource,
    dataCenter: connection.dataCenter,
    master_hash: connection.master_hash,
    isFrozen: connection.is_frozen,
    groups: connection.groups?.map((group) => {
      return {
        id: group.id,
        title: group.title,
        isMain: group.isMain,
        users: group.users?.map((user) => {
          return {
            id: user.id,
            isActive: user.isActive,
            email: user.email,
            createdAt: user.createdAt,
            suspended: user.suspended,
            name: user.name,
            is_2fa_enabled: user.isOTPEnabled,
            role: user.role,
            externalRegistrationProvider: user.externalRegistrationProvider,
            show_test_connections: user.showTestConnections,
          };
        }),
      };
    }),
  };
}
