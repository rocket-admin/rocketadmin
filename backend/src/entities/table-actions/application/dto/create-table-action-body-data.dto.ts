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
  ValidateNested,
} from 'class-validator';
import { TableActionTypeEnum } from '../../../../enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';
import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';

export class CreateTableActionEventDto {
  @ApiProperty({ enum: TableActionEventEnum })
  @IsNotEmpty()
  @IsEnum(TableActionEventEnum)
  event: TableActionEventEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  icon: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  require_confirmation: boolean;
}

export class CreateActionRuleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  table_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsArray()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  events_data: Array<CreateTableActionEventDto>;
}

export class CreateTableActionDto {
  @ApiProperty({ enum: TableActionTypeEnum })
  @IsNotEmpty()
  @IsEnum(TableActionTypeEnum)
  action_type: TableActionTypeEnum;

  @ApiProperty()
  @IsOptional()
  @IsUrl()
  @MinLength(1)
  @MaxLength(2048)
  url: string;

  @ApiProperty({ enum: TableActionMethodEnum })
  @IsNotEmpty()
  @IsEnum(TableActionMethodEnum)
  action_method: TableActionMethodEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  slack_url: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsEmail({}, { each: true })
  emails: Array<string>;
}

export class CreateTableActionBodyDataDto {
  @ApiProperty({ type: CreateTableActionDto })
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  table_action_data: CreateTableActionDto;

  @ApiProperty({ type: CreateActionRuleDto, isArray: true })
  @IsNotEmpty()
  @IsArray()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  action_rules_data: Array<CreateActionRuleDto>;
}
