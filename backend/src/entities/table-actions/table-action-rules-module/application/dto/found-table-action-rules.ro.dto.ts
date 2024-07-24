import { ApiProperty } from '@nestjs/swagger';
import { FoundActionRulesWithActionsAndEventsDTO } from './found-action-rules-with-actions-and-events.dto.js';

export class FoundTableActionRulesRoDTO {
  @ApiProperty({ type: FoundActionRulesWithActionsAndEventsDTO, isArray: true })
  action_rules: Array<FoundActionRulesWithActionsAndEventsDTO>;

  @ApiProperty()
  display_name: string;
}
