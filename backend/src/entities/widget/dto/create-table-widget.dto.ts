import { ApiProperty } from '@nestjs/swagger';
import { WidgetTypeEnum } from '../../../enums/index.js';

export class CreateTableWidgetDto {
  @ApiProperty()
  field_name: string;

  @ApiProperty({ enum: WidgetTypeEnum })
  widget_type: WidgetTypeEnum;

  @ApiProperty()
  widget_params: string;

  @ApiProperty()
  widget_options: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class CreateOrUpdateTableWidgetsDto {
  widgets: Array<CreateTableWidgetDto>;
}
