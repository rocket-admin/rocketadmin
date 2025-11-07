import { ApiProperty } from '@nestjs/swagger';
import { QueryOrderingEnum } from '../../../../enums/query-ordering.enum.js';
import { IsEnum, IsOptional } from 'class-validator';

export class CreatePersonalTableSettingsDto {
  @ApiProperty({ enumName: 'QueryOrderingEnum', enum: QueryOrderingEnum, description: 'The ordering direction' })
  @IsOptional()
  @IsEnum(QueryOrderingEnum)
  ordering: QueryOrderingEnum;

  @ApiProperty({ type: String, description: 'The ordering field' })
  ordering_field: string;

  @ApiProperty({ type: Number, description: 'The number of items per page' })
  list_per_page: number;

  @ApiProperty({ isArray: true, type: String, description: 'The columns view' })
  columns_view: Array<string>;

  @ApiProperty({ type: [String], description: 'The order of columns' })
  list_fields: Array<string>;

  @ApiProperty({ type: Boolean, description: 'Whether to use original column names' })
  original_names: boolean;
}
