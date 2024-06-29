import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, MinLength, IsArray, IsObject, IsOptional, IsUUID } from 'class-validator';
import { CreateTableActionDTO, CreateActionEventDTO } from './create-action-rules-with-actions-and-events-body.dto.js';

export class UpdateTableActionDTO extends CreateTableActionDTO {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;
}

export class UpdateActionEventDTO extends CreateActionEventDTO {
  @ApiProperty({ type: String, required: false})
  @IsOptional()
  @IsString()
  @IsUUID()
  id?: string;
}

export class UpdateTableActionRuleBodyDTO {
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

  @ApiProperty({ type: UpdateTableActionDTO, isArray: true})
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsObject({ each: true })
  table_actions: Array<UpdateTableActionDTO>;

  @ApiProperty({ type: UpdateActionEventDTO, isArray: true })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsObject({ each: true })
  events: Array<UpdateActionEventDTO>;
}
