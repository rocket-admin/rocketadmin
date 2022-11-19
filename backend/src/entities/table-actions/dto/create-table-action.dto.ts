import { ApiProperty } from '@nestjs/swagger';
import { TableActionTypeEnum } from '../../../enums';

export class CreateTableActionDTO {
  @ApiProperty()
  title: string;

  @ApiProperty()
  type: TableActionTypeEnum;

  @ApiProperty()
  url: string;

  @ApiProperty()
  tableName: string;

  @ApiProperty()
  icon: string;
}
