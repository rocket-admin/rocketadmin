import { ApiProperty } from '@nestjs/swagger';
import { EncryptionAlgorithmEnum, WidgetTypeEnum } from '../../enums/index.js';

export class TableWidgetRO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  field_name: string;

  @ApiProperty({ enum: WidgetTypeEnum })
  widget_type?: WidgetTypeEnum;

  @ApiProperty()
  widget_params: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  description?: string;
}

export interface IPasswordWidgetParams {
  encrypt: boolean;
  algorithm: EncryptionAlgorithmEnum;
}
