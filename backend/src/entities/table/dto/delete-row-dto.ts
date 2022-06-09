import { ApiProperty } from '@nestjs/swagger';

export class DeleteRowDto {
  @ApiProperty()
  tableName: string;

  @ApiProperty()
  primaryColumn: Record<string, unknown>;
}
