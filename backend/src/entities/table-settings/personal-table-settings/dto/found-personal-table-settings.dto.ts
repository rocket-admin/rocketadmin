import { ApiProperty } from '@nestjs/swagger';
import { QueryOrderingEnum } from '../../../../enums/query-ordering.enum.js';

export class FoundPersonalTableSettingsDto {
  @ApiProperty({ type: String, description: 'The entity id' })
  id: string;

  @ApiProperty({ type: String, description: 'The table name' })
  table_name: string;

  @ApiProperty({ type: String, enum: ['ASC', 'DESC'], description: 'The ordering direction' })
  ordering: QueryOrderingEnum;

  @ApiProperty({ type: String, description: 'The ordering field' })
  ordering_field: string;

  @ApiProperty({ type: Number, description: 'The number of items per page' })
  list_per_page: number;

  @ApiProperty({ type: [String], description: 'The list of fields to display in the table' })
  list_fields: string[];

  @ApiProperty({ type: Boolean, description: 'Whether to use original column names' })
  original_names: boolean;
}
