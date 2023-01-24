import { WidgetTypeEnum } from '../../../enums/index.js';

export class UpdateTableWidgetDto {
  id: string;

  field_name: string;

  widget_type: WidgetTypeEnum;

  widget_params: Array<string>;
}
