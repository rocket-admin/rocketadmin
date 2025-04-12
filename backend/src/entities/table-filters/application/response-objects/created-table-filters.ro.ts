import { ApiProperty } from '@nestjs/swagger';

export class CreatedTableFiltersRO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tableName: string;

  @ApiProperty()
  connectionId: string;

  @ApiProperty({ type: Object })
  filters: Record<string, any>;
}
