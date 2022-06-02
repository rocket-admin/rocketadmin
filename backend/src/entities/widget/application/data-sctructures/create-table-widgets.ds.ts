import { WidgetTypeEnum } from '../../../../enums';

export class CreateTableWidgetsDs {
  connectionId: string;
  masterPwd: string;
  tableName: string;
  userId: string;
  widgets: Array<CreateTableWidgetDs>;
}

export class CreateTableWidgetDs {
  description: string;
  field_name: string;
  name: string;
  widget_options: string;
  widget_params: string;
  widget_type: WidgetTypeEnum;
}
