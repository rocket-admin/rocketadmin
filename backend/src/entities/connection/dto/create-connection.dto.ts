import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionDto {
  @ApiProperty()
  title?: string;

  @ApiProperty()
  masterEncryption: boolean;

  @ApiProperty()
  type: string;

  @ApiProperty()
  host: string;

  @ApiProperty()
  port: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  database: string;

  @ApiProperty()
  schema: string;

  @ApiProperty()
  sid: string;

  @ApiProperty()
  ssh?: boolean;

  @ApiProperty()
  privateSSHKey?: string;

  @ApiProperty()
  sshHost?: string;

  @ApiProperty()
  sshPort?: number;

  @ApiProperty()
  sshUsername?: string;

  @ApiProperty()
  ssl?: boolean;

  @ApiProperty()
  cert?: string;

  @ApiProperty()
  azure_encryption?: boolean;

  isTestConnection?: boolean;
}
