import { ApiProperty } from '@nestjs/swagger';

export class UpdateRowDto {
  @ApiProperty()
  row: Record<string, unknown>;

  @ApiProperty()
  tableName: string;
}
