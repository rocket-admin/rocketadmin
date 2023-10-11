import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../../enums/index.js';

export class CreateTableActionDS {
  connectionId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TableActionTypeEnum })
  type: TableActionTypeEnum;

  @ApiProperty()
  url: string;
  tableName: string;
  masterPwd: string;
  userId: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  requireConfirmation: boolean;
}
