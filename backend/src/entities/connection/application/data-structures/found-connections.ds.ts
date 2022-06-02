import { AccessLevelEnum, ConnectionTypeEnum } from '../../../../enums';
import { UserEntity } from '../../../user/user.entity';

export class FoundConnectionsDs {
  connections: Array<{
    connection: FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs;
    accessLevel: AccessLevelEnum;
  }>;
  connectionsCount: number;
}

export class FoundDirectConnectionsDs {
  id: string;
  title?: string;
  masterEncryption: boolean;
  type?: ConnectionTypeEnum | string;
  host?: string;
  port?: number | null;
  username?: string;
  database?: string;
  schema?: string;
  sid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  ssh?: boolean;
  sshHost?: string;
  sshPort?: number;
  ssl?: boolean;
  cert?: string;
  author?: UserEntity | string;
  token?: string;
  azure_encryption?: boolean;
}

export class FoundDirectConnectionsNonePermissionDs {
  id: string;
  title?: string;
  type?: ConnectionTypeEnum | string;
  database: string;
}

export class FoundAgentConnectionsDs {
  id: string;
  title?: string;
  type?: ConnectionTypeEnum | string;
  author: UserEntity | string;
  token: string;
}
