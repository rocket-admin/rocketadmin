import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/index.js';
import { TableActionMethodEnum } from '../../../../enums/table-action-method-enum.js';

export class CreatedTableActionDS {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  type: TableActionTypeEnum;

  @ApiProperty()
  url: string;

  @ApiProperty()
  requireConfirmation: boolean;

  @ApiProperty({ enum: TableActionMethodEnum })
  method: TableActionMethodEnum;

  @ApiProperty()
  slack_url: string;

  @ApiProperty({ isArray: true, type: String })
  emails?: string[];
}
