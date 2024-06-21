import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray } from 'class-validator';
import { TableActionEventEnum } from '../../../../../enums/table-action-event-enum.js';

export class CreateTableTriggersBodyDTO {
  @ApiProperty({ isArray: true, type: 'string' })
  @IsArray()
  @ArrayNotEmpty()
  actions_ids: Array<string>;

  @ApiProperty({ isArray: true, enum: TableActionEventEnum })
  @IsArray()
  @ArrayNotEmpty()
  trigger_events: Array<TableActionEventEnum>;
}
