import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/src/data-access-layer/shared/enums/connection-types-enum.js';
import { UserEntity } from '../../../user/user.entity.js';
import { FoundGroupDataWithUsersDs } from '../../../group/application/data-sctructures/found-user-groups.ds.js';
import { SimpleFoundUserInfoDs } from '../../../user/dto/found-user.dto.js';

export class FoundDirectConnectionsDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty()
  masterEncryption: boolean;

  @ApiProperty({ enum: ConnectionTypesEnum })
  type?: ConnectionTypesEnum | string;

  @ApiProperty()
  host?: string;

  @ApiProperty()
  port?: number | null;

  @ApiProperty()
  username?: string;

  @ApiProperty()
  database?: string;

  @ApiProperty()
  schema?: string;

  @ApiProperty({ required: false })
  sid?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty()
  ssh?: boolean;

  @ApiProperty({ required: false })
  sshHost?: string;

  @ApiProperty({ required: false })
  sshPort?: number;

  @ApiProperty()
  ssl?: boolean;

  @ApiProperty({ required: false })
  cert?: string;

  @ApiProperty({ required: false })
  author?: UserEntity | string;

  @ApiProperty({ required: false })
  token?: string;

  @ApiProperty({ required: false })
  azure_encryption?: boolean;

  @ApiProperty()
  signing_key: string;

  @ApiProperty({ required: false })
  authSource?: string;

  @ApiProperty({ required: false })
  dataCenter?: string;

  @ApiProperty()
  isTestConnection: boolean;

  @ApiProperty({ required: false })
  connection_properties?: any;

  @ApiProperty()
  isFrozen: boolean;
}

export class FoundDirectConnectionsNonePermissionDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty()
  type?: ConnectionTypesEnum | string;

  @ApiProperty()
  database: string;

  @ApiProperty()
  isTestConnection: boolean;

  @ApiProperty()
  connection_properties: any;

  @ApiProperty()
  isFrozen: boolean;
}

export class FoundAgentConnectionsDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title?: string;

  @ApiProperty({ enum: ConnectionTypesEnum })
  type?: ConnectionTypesEnum | string;

  @ApiProperty({ required: false })
  author: UserEntity | string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  signing_key: string;

  @ApiProperty()
  isTestConnection: boolean;

  @ApiProperty({ required: false })
  connection_properties: any;
}

export class FoundSipleConnectionInfoDS {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title?: string;

  @ApiProperty({ enum: ConnectionTypesEnum })
  type?: ConnectionTypesEnum | string;

  @ApiProperty()
  isTestConnection: boolean;

  @ApiProperty({ required: false })
  author: SimpleFoundUserInfoDs;

  @ApiProperty({ isArray: true })
  groups: Array<FoundGroupDataWithUsersDs>;
}

export class ConnectionWithAccessLevelDS {
  @ApiProperty()
  connection: FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs;

  @ApiProperty()
  accessLevel: AccessLevelEnum;
}

export class FoundConnectionsDs {
  @ApiProperty({ isArray: true, type: ConnectionWithAccessLevelDS })
  connections: Array<ConnectionWithAccessLevelDS>;

  @ApiProperty()
  connectionsCount: number;
}
