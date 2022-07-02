import { ConnectionEntity } from '../connection.entity';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds';
import { Encryptor } from '../../../helpers/encryption/encryptor';

export function buildCreatedConnectionDs(
  connection: ConnectionEntity,
  token: string,
  masterPwd: string,
): CreatedConnectionDs {
  if (connection.masterEncryption && masterPwd) {
    connection = Encryptor.decryptConnectionCredentials(connection, masterPwd);
  }
  const groupsWithProcessedUsers = connection.groups.map((group) => {
    group.users = group.users.map((user) => {
      delete user.password;
      return user;
    });
    return group;
  });
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
    groups: groupsWithProcessedUsers,
  };
}
