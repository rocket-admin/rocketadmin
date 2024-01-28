import { ApiProperty } from '@nestjs/swagger';
import { CreatedConnectionDs } from '../data-structures/created-connection.ds.js';

export class UpdatedConnectionResponseDTO {
  @ApiProperty()
  connection: Omit<CreatedConnectionDs, 'groups'>;
}
