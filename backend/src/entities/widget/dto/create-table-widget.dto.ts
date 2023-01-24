import { WidgetTypeEnum } from '../../../enums/index.js';

export class CreateTableWidgetDto {
  field_name: string;

  widget_type: WidgetTypeEnum;

  widget_params: string;

  widget_options: string;

  name: string;

  description: string;
}

export class CreateOrUpdateTableWidgetsDto {
  widgets: Array<CreateTableWidgetDto>;
}
