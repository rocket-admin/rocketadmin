import {
  FoundAgentConnectionsDs,
  FoundDirectConnectionsDs,
  FoundDirectConnectionsNonePermissionDs,
} from '../application/data-structures/found-connections.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { FilteredConnection } from '../use-cases/find-all-connections.use.case.js';

export function buildFoundConnectionDs(
  connection: ConnectionEntity | FilteredConnection,
): FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs {
  return {
    author: connection.author?.id,
    azure_encryption: connection.azure_encryption,
    cert: connection.cert,
    createdAt: connection.createdAt,
    database: connection.database,
    host: connection.host,
    id: connection.id,
    masterEncryption: connection.masterEncryption,
    port: connection.port,
    schema: connection.schema,
    sid: connection.sid,
    ssh: connection.ssh,
    sshHost: connection.sshHost,
    sshPort: connection.sshPort,
    ssl: connection.ssl,
    title: connection.title,
    token: connection.agent?.token,
    type: connection.type,
    updatedAt: connection.updatedAt,
    username: connection.username,
    signing_key: connection.signing_key,
    isTestConnection: connection.isTestConnection,
    connection_properties: connection.connection_properties,
    isFrozen: connection.is_frozen,
    authSource: connection.authSource ? connection.authSource : undefined,
    dataCenter: connection.dataCenter ? connection.dataCenter : undefined,
  };
}
