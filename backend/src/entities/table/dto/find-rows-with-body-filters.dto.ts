import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class FindAllRowsWithBodyFiltersDto {
  @ApiProperty({
    type: 'object',
    example: {
      f_id__eq: 1,
      f_name__startswith: 'Abc',
      f_name__endswith: 'Xyz',
      f_name__gt: 5,
      f_name__lt: 10,
      f_name__lte: 9,
      f_name__gte: 6,
    },
  })
  @IsObject()
  @IsOptional()
  filters: Record<string, unknown>;
}
