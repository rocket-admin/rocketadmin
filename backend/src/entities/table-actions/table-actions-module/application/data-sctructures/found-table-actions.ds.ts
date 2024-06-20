import { ApiProperty } from '@nestjs/swagger';
import { CreatedTableActionDS } from './created-table-action.ds.js';

export class FoundTableActionsDS {
  @ApiProperty()
  table_name: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ isArray: true, type: CreatedTableActionDS })
  table_actions: Array<CreatedTableActionDS>;
}
