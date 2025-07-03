import { ApiProperty } from '@nestjs/swagger';

export class FullTableStructureDs {
  @ApiProperty()
  column_name: string;

  @ApiProperty()
  column_default: string | number;

  @ApiProperty()
  data_type: string;

  @ApiProperty()
  data_type_params: string;

  @ApiProperty()
  isExcluded: boolean;

  @ApiProperty()
  isSearched: boolean;

  @ApiProperty()
  auto_increment: boolean;

  @ApiProperty()
  allow_null: boolean;

  @ApiProperty()
  character_maximum_length: number;
}
