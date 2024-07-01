import { ApiProperty } from '@nestjs/swagger';
import { FoundTableActionDTO } from '../../../table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';

export class FoundTableActionsDS {
  @ApiProperty()
  table_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true, type: FoundTableActionDTO })
  table_actions: Array<FoundTableActionDTO>;
}
