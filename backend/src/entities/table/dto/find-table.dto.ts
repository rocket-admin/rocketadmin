import { ApiProperty } from '@nestjs/swagger';

export class FindTableDto {
  @ApiProperty()
  tableName: string;
}
