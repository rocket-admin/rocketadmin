import { ApiProperty } from '@nestjs/swagger';
import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class FoundActionEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TableActionEventEnum })
  event: TableActionEventEnum;

  @ApiProperty()
  title: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  require_confirmation: boolean;

  @ApiProperty()
  created_at: Date;
}

export class FoundActionRuleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  table_name: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ isArray: true, type: FoundActionEventDto })
  action_events: Array<FoundActionEventDto>;
}

export class FoundTableActionWithEventsAndRulesDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: TableActionMethodEnum })
  method: TableActionMethodEnum;

  @ApiProperty()
  slack_url: string;

  @ApiProperty({ isArray: true, type: String })
  emails: string[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: FoundActionRuleDto, isArray: true })
  action_rules: Array<FoundActionRuleDto>;
}
