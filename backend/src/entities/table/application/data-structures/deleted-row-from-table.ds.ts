import { ApiProperty } from '@nestjs/swagger';

export class DeletedRowFromTableDs {
  @ApiProperty()
  row: Record<string, unknown>;
}
