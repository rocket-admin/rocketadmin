import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class FindAllRowsWithBodyFiltersDto {
  @ApiProperty({
    type: 'object',
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
