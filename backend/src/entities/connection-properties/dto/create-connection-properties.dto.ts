import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionPropertiesDto {
  @ApiProperty()
  hidden_tables: Array<string>;
}
