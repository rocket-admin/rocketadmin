import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { isTest } from '../../../../helpers/app/is-test.js';
import {
  ConnectionTypesEnum,
  ConnectionTypeTestEnum,
} from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

export class CreateConnectionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty()
  masterEncryption: boolean;

  @IsEnum(isTest() ? ConnectionTypeTestEnum : ConnectionTypesEnum)
  @ApiProperty()
  type: ConnectionTypesEnum;

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
  sid?: string;

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
  @ApiProperty({ required: false })
  isTestConnection?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  authSource?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  dataCenter?: string;
}
