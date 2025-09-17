import { ApiProperty } from '@nestjs/swagger';

export class FoundTableCategoryRo {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  category_name: string;

  @ApiProperty({ isArray: true, type: String })
  tables: Array<string>;
}
