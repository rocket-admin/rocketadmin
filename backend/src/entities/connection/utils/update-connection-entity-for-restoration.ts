import { ConnectionEntity } from '../connection.entity.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { isConnectionEntityAgent } from '../../../helpers/index.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';

export async function updateConnectionEntityForRestoration(
  toUpdate: ConnectionEntity,
  updateParameters: UpdateConnectionDs,
  isTestConnection: boolean,
): Promise<ConnectionEntity> {
  const {
    connection_parameters,
    update_info: { masterPwd },
  } = updateParameters;
  toUpdate.title = connection_parameters.title;
  toUpdate.type = connection_parameters.type;
  toUpdate.ssh = connection_parameters.ssh;
  toUpdate.ssl = connection_parameters.ssl;
  toUpdate.isTestConnection = isTestConnection;
  if (!isConnectionEntityAgent(connection_parameters)) {
    toUpdate.masterEncryption = connection_parameters.masterEncryption;
    toUpdate.host = connection_parameters.host;
    toUpdate.port = connection_parameters.port;
    toUpdate.username =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.username, masterPwd)
        : connection_parameters.username;
    toUpdate.password =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.password, masterPwd)
        : connection_parameters.password;
    toUpdate.database =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.database, masterPwd)
        : connection_parameters.database;
    toUpdate.sid = connection_parameters.sid;
    toUpdate.privateSSHKey =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.privateSSHKey, masterPwd)
        : connection_parameters.privateSSHKey;
    toUpdate.sshHost =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.sshHost, masterPwd)
        : connection_parameters.sshHost;
    toUpdate.sshPort = connection_parameters.sshPort ? connection_parameters.sshPort : undefined;
    toUpdate.sshUsername =
      connection_parameters.masterEncryption && masterPwd
        ? Encryptor.encryptDataMasterPwd(connection_parameters.sshUsername, masterPwd)
        : connection_parameters.sshUsername;
    toUpdate.cert = connection_parameters.cert;
    toUpdate.schema = connection_parameters.schema;
    toUpdate.azure_encryption = connection_parameters.azure_encryption;
  }
  return toUpdate;
}
