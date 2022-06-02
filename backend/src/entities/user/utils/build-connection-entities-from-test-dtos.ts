import { CreateConnectionDto } from '../../connection/dto';
import { ConnectionEntity } from '../../connection/connection.entity';

export function buildConnectionEntitiesFromTestDtos(dtos: Array<CreateConnectionDto>): Array<ConnectionEntity> {
  const entities: Array<ConnectionEntity> = [];
  for (const dto of dtos) {
    const connection = new ConnectionEntity();
    connection.title = dto.title;
    connection.masterEncryption = dto.masterEncryption || false;
    connection.type = dto.type;
    connection.host = dto.host;
    connection.port = dto.port;
    connection.username = dto.username;
    connection.password = dto.password;
    connection.database = dto.database;
    connection.schema = dto.schema;
    connection.sid = dto.sid;
    connection.ssh = dto.ssh || false;
    connection.privateSSHKey = dto.privateSSHKey;
    connection.sshHost = dto.sshHost;
    connection.sshPort = dto.sshPort;
    connection.sshUsername = dto.sshUsername;
    connection.ssl = dto.ssl || false;
    connection.cert = dto.cert;
    connection.azure_encryption = dto.azure_encryption || false;
    connection.isTestConnection = dto.isTestConnection;
    entities.push(connection);
  }
  return entities;
}
