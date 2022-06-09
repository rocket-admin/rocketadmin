import { ApiProperty } from '@nestjs/swagger';

export class CreateConnectionPropertiesDs {
  @ApiProperty()
  hidden_tables: Array<string>;

  userId: string;

  connectionId: string;

  master_password: string;
}
