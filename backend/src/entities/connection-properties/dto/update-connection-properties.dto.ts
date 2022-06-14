import { ApiProperty } from '@nestjs/swagger';

export class UpdateConnectionPropertiesDto {
  @ApiProperty()
  hidden_tables: Array<string>;
}
