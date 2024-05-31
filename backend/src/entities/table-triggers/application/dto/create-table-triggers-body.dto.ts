import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray } from 'class-validator';
import { TableTriggerEventEnum } from '../../../../enums/table-trigger-event-enum.js';

export class CreateTableTriggersBodyDTO {
  @ApiProperty({ isArray: true, type: 'string' })
  @IsArray()
  @ArrayNotEmpty()
  actions_ids: Array<string>;

  @ApiProperty({ isArray: true, enum: TableTriggerEventEnum })
  @IsArray()
  @ArrayNotEmpty()
  trigger_events: Array<TableTriggerEventEnum>;
}
