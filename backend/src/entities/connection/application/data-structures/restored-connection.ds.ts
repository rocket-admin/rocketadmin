import { ApiProperty } from '@nestjs/swagger';
import { CreatedConnectionDTO } from '../dto/created-connection.dto.js';

export class RestoredConnectionDs {
  @ApiProperty()
  connection: CreatedConnectionDTO;
}
