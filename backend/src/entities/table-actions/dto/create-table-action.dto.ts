import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../enums/index.js';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TableActionMethodEnum } from '../../../enums/table-action-method-enum.js';

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
  @IsOptional()
  @IsString()
  url: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  icon: string;

  @ApiProperty({ enum: TableActionMethodEnum })
  @IsOptional()
  @IsEnum(TableActionMethodEnum)
  method: TableActionMethodEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  slack_url: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  requireConfirmation: boolean;
}
