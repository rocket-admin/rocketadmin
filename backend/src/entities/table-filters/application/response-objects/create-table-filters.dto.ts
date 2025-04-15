import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { FilterCriteriaEnum } from '../../../../enums/filter-criteria.enum.js';

export class DynamicTableFilterDto {
  @ApiProperty({ type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  column_name: string;

  @ApiProperty({ enum: FilterCriteriaEnum })
  comparator: FilterCriteriaEnum;
}

export class CreateTableFilterDto {
  @ApiProperty({ type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: {
          eq: { type: 'number' },
        },
      },
      name: {
        type: 'object',
        properties: {
          startswith: { type: 'string' },
        },
      },
      age: {
        type: 'object',
        properties: {
          gt: { type: 'number' },
          lt: { type: 'number' },
        },
      },
    },
    example: {
      id: {
        eq: 1,
      },
      name: {
        startswith: 'A',
      },
      age: {
        gt: 18,
        lt: 30,
      },
    },
  })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiProperty({ type: DynamicTableFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  dynamic_column: DynamicTableFilterDto;
}
