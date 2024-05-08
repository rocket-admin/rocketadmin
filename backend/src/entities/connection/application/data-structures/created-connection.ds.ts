import { ApiProperty } from '@nestjs/swagger';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { GroupEntity } from '../../../group/group.entity.js';

export class CreatedConnectionDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  masterEncryption: boolean;

  @ApiProperty({ enum: ConnectionTypesEnum })
  type: ConnectionTypesEnum | string;

  @ApiProperty()
  host: string;

  @ApiProperty()
  port: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  database: string;

  @ApiProperty()
  schema: string;

  @ApiProperty()
  sid: string;

  @ApiProperty()
  ssh: boolean;

  @ApiProperty()
  sshHost: string;

  @ApiProperty()
  sshPort: number;

  @ApiProperty()
  sshUsername: string;

  @ApiProperty()
  ssl: boolean;

  @ApiProperty()
  cert: string;

  @ApiProperty()
  azure_encryption: boolean;

  @ApiProperty()
  token: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isTestConnection: boolean;

  @ApiProperty()
  author: string;

  @ApiProperty()
  authSource: string;

  @ApiProperty({ isArray: true, type: GroupEntity })
  groups: Array<GroupEntity>;
}
