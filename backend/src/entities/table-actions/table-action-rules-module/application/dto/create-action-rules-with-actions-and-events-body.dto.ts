import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TableActionTypeEnum } from '../../../../../enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../../../enums/table-action-method-enum.js';
import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';

export class CreateTableActionDTO {
  @ApiProperty({ enum: TableActionTypeEnum })
  @IsEnum(TableActionTypeEnum)
  @IsNotEmpty()
  type: TableActionTypeEnum;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string;

  @ApiProperty({ enum: TableActionMethodEnum })
  @IsEnum(TableActionMethodEnum)
  @IsNotEmpty()
  method: TableActionMethodEnum;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @MinLength(1)
  slack_url?: string;

  @ApiProperty({ type: String, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsEmail({}, { each: true })
  emails?: Array<string>;
}

export class CreateActionEventDTO {
  @ApiProperty({ enum: TableActionEventEnum })
  @IsEnum(TableActionEventEnum)
  @IsNotEmpty()
  event: TableActionEventEnum;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(1)
  title: string;

  @ApiProperty({ type: String, required: false})
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  require_confirmation: boolean;
}

export class CreateTableActionRuleBodyDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(1)
  table_name: string;

  @ApiProperty({ type: CreateTableActionDTO, isArray: true })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsObject({ each: true })
  table_actions: Array<CreateTableActionDTO>;

  @ApiProperty({ type: CreateActionEventDTO, isArray: true })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsObject({ each: true })
  events: Array<CreateActionEventDTO>;
}
