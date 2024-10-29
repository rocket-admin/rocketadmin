import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class FindAllRowsWithBodyFiltersDto {
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
  @IsOptional()
  filters: Record<string, unknown>;
}