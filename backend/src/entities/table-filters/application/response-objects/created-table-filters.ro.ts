import { ApiProperty } from '@nestjs/swagger';
import { CreateTableFilterDto } from './create-table-filters.dto.js';

export class CreatedTableFilterRO extends CreateTableFilterDto {
  @ApiProperty({ type: 'string' })
  id: string;

  @ApiProperty({ type: 'string' })
  table_name: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}
