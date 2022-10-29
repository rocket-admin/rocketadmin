import { ApiProperty } from '@nestjs/swagger';
import { CreateTableActionDTO } from './create-table-action.dto';

export class UpdateTableActionDTO extends CreateTableActionDTO {
  @ApiProperty()
  actionId: string;
}
