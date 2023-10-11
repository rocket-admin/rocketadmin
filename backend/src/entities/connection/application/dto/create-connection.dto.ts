import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionDto {
  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  ssh?: boolean;

  @ApiProperty({ required: false })
  privateSSHKey?: string;

  @ApiProperty({ required: false })
  sshHost?: string;

  @ApiProperty({ required: false })
  sshPort?: number;

  @ApiProperty({ required: false })
  sshUsername?: string;

  @ApiProperty({ required: false })
  ssl?: boolean;

  @ApiProperty({ required: false })
  cert?: string;

  @ApiProperty({ required: false })
  azure_encryption?: boolean;

  isTestConnection?: boolean;
}
