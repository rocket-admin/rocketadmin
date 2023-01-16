import { ApiProperty } from '@nestjs/swagger';
import { CreateTableActionDTO } from './create-table-action.dto.js';

export class UpdateTableActionDTO extends CreateTableActionDTO {
  @ApiProperty()
  actionId: string;
}
