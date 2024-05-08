import { ConnectionEntity } from '../connection.entity.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { UserEntity } from '../../user/user.entity.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';

export function buildConnectionEntity(
  createConnectionData: CreateConnectionDs,
  connectionAuthor: UserEntity,
): ConnectionEntity {
  let connection: ConnectionEntity = new ConnectionEntity();
  const {
    connection_parameters: {
      azure_encryption,
      cert,
      masterEncryption,
      port,
      schema,
      sid,
      ssh,
      sshHost,
      sshPort,
      ssl,
      title,
      host,
      sshUsername,
      username,
      privateSSHKey,
      database,
      type,
      password,
      authSource,
    },
    creation_info: { masterPwd },
  } = createConnectionData;

  connection.title = title;
  connection.type = type;
  connection.ssh = ssh;
  connection.ssl = ssl;
  connection.azure_encryption = azure_encryption;
  connection.author = connectionAuthor;
  connection.masterEncryption = masterEncryption;
  connection.host = host;
  connection.port = port;
  connection.username = username;
  connection.password = password;
  connection.database = database;
  connection.sid = sid;
  connection.privateSSHKey = privateSSHKey;
  connection.sshHost = sshHost;
  connection.sshPort = sshPort ? sshPort : undefined;
  connection.sshUsername = sshUsername;
  connection.cert = cert;
  connection.schema = schema;
  connection.authSource = authSource;

  if (connection.masterEncryption && masterPwd && !isConnectionTypeAgent(connection.type)) {
    connection = Encryptor.encryptConnectionCredentials(connection, masterPwd);
  }
  return connection;
}
