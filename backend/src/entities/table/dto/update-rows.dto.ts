import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateRowsDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  @IsObject({ each: true })
  primaryKeys: Array<Record<string, unknown>>;

  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  newValues: Record<string, unknown>;
}
