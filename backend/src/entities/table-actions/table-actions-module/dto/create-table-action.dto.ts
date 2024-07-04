import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/index.js';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class CreateTableActionDTO {
  @ApiProperty({ enum: TableActionTypeEnum })
  @IsEnum(TableActionTypeEnum)
  type: TableActionTypeEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  url: string;

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
}
