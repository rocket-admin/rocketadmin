import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/table-action-type.enum.js';

export class FoundTableActionInTriggersDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  type: TableActionTypeEnum;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty()
  require_confirmation: boolean;
}

export class FoundTableTriggersWithActionsDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({
    isArray: true,
    type: FoundTableActionInTriggersDTO,
  })
  table_actions: Array<FoundTableActionInTriggersDTO>;
}
