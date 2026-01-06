import { ApiProperty } from '@nestjs/swagger';
import { QueryOrderingEnum } from '../../../../enums/query-ordering.enum.js';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class CreatePersonalTableSettingsDto {
  @ApiProperty({ enumName: 'QueryOrderingEnum', enum: QueryOrderingEnum, description: 'The ordering direction' })
  @IsOptional()
  @IsEnum(QueryOrderingEnum)
  ordering: QueryOrderingEnum;

  @ApiProperty({ type: String, description: 'The ordering field' })
  @IsOptional()
  ordering_field: string;

  @ApiProperty({ type: Number, description: 'The number of items per page' })
  @IsOptional()
  list_per_page: number;

  @ApiProperty({ isArray: true, type: String, description: 'The columns view' })
  @IsOptional()
  columns_view: Array<string>;

  @ApiProperty({ type: [String], description: 'The order of columns' })
  @IsOptional()
  list_fields: Array<string>;

  @ApiProperty({ type: Boolean, description: 'Whether to use original column names' })
  @IsOptional()
  @IsBoolean()
  original_names: boolean;
}
