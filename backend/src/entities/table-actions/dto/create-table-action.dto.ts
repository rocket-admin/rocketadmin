import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../enums/index.js';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateTableActionDTO {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  @IsEnum(TableActionTypeEnum)
  type: TableActionTypeEnum;

  @ApiProperty()
  @IsUrl()
  url: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  icon: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  requireConfirmation: boolean;
}
