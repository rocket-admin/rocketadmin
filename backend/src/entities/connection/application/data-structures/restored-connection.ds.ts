import { ApiProperty } from '@nestjs/swagger';
import { CreatedConnectionDs } from './created-connection.ds.js';

export class RestoredConnectionDs {
  @ApiProperty()
  connection: CreatedConnectionDs;
}
