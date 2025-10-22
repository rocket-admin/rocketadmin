import { ApiProperty } from '@nestjs/swagger';

export class FoundTableCategoryRo {
  @ApiProperty({ type: String })
  category_id: string;

  @ApiProperty({ type: String })
  category_name: string;

  @ApiProperty({ type: String })
  category_color: string;

  @ApiProperty({ isArray: true, type: String })
  tables: Array<string>;
}
