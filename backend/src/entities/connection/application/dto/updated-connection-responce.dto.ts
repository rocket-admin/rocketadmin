import { ApiProperty } from '@nestjs/swagger';
import { CreatedConnectionDTO } from './created-connection.dto.js';

export class UpdatedConnectionResponseDTO {
  @ApiProperty()
  connection: Omit<CreatedConnectionDTO, 'groups'>;
}
