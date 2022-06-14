import { ApiProperty } from '@nestjs/swagger';

export class AddRowDto {
  @ApiProperty()
  row: Record<string, unknown>;

  @ApiProperty()
  tableName: string;
}
