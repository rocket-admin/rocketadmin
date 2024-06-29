import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../../enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../../../enums/table-action-method-enum.js';
import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';

export class FoundTableActionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  type: TableActionTypeEnum;

  @ApiProperty({ type: String, nullable: true })
  url?: string | null;

  @ApiProperty({ enum: TableActionMethodEnum })
  method: TableActionMethodEnum;

  @ApiProperty({ type: String, nullable: true })
  slack_url?: string | null;

  @ApiProperty({ type: String, isArray: true })
  emails: Array<string>;

  @ApiProperty()
  created_at: Date;
}

export class FoundActionEventDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TableActionEventEnum })
  event: TableActionEventEnum;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  icon: string | null;

  @ApiProperty()
  require_confirmation: boolean;

  @ApiProperty()
  created_at: Date;
}

export class FoundActionRulesWithActionsAndEventsDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: FoundTableActionDTO, isArray: true })
  table_actions: Array<FoundTableActionDTO>;

  @ApiProperty({ type: FoundActionEventDTO, isArray: true })
  events: Array<FoundActionEventDTO>;
}
