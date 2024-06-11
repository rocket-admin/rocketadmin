import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class CreatedTableActionDS {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  type: TableActionTypeEnum;

  @ApiProperty()
  url: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  requireConfirmation: boolean;

  @ApiProperty({ enum: TableActionMethodEnum })
  method: TableActionMethodEnum;

  @ApiProperty()
  slackChannel?: string;

  @ApiProperty()
  slackBotToken?: string;

  @ApiProperty({ isArray: true, type: String })
  emails?: string[];
}
