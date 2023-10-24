import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ConnectionTypeEnum } from '../../../../enums/connection-type.enum.js';

export class CreateConnectionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  masterEncryption: boolean;

  @IsEnum(ConnectionTypeEnum)
  @ApiProperty()
  type: ConnectionTypeEnum;

  @IsOptional()
  @IsString()
  @ApiProperty()
  host: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Max(65535)
  @Min(0)
  @ApiProperty()
  port: number;

  @IsOptional()
  @IsString()
  @ApiProperty()
  username: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  password: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  database: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  schema: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  sid: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  ssh?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  privateSSHKey?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  sshHost?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Max(65535)
  @Min(0)
  @ApiProperty({ required: false })
  sshPort?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  sshUsername?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  ssl?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  cert?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  azure_encryption?: boolean;

  @IsOptional()
  @IsBoolean()
  isTestConnection?: boolean;
}
