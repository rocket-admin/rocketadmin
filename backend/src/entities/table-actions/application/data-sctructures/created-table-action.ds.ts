import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/index.js';

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
}
