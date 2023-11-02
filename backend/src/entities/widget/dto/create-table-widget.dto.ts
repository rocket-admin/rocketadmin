import { ApiProperty } from '@nestjs/swagger';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateTableWidgetDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  field_name: string;

  @ApiProperty({ enum: WidgetTypeEnum })
  @IsOptional()
  @IsEnum(WidgetTypeEnum)
  widget_type: WidgetTypeEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  widget_params: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  widget_options: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description: string;
}

export class CreateOrUpdateTableWidgetsDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  widgets: Array<CreateTableWidgetDto>;
}
