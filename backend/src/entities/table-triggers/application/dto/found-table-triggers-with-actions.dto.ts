import { ApiProperty } from '@nestjs/swagger';
import { TableTriggerEventEnum } from '../../../../enums/table-trigger-event-enum.js';
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
    enum: TableTriggerEventEnum,
    example: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.DELETE_ROW, TableTriggerEventEnum.UPDATE_ROW],
  })
  trigger_events: Array<TableTriggerEventEnum>;

  @ApiProperty({
    isArray: true,
    type: FoundTableActionInTriggersDTO,
  })
  table_actions: Array<FoundTableActionInTriggersDTO>;
}
