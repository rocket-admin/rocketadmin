import { TableWidgetTypeEnum } from '../enums/table-widget-type.enum.js';

export class TableWidgetDS {
  id: string;
  field_name: string;
  widget_type?: TableWidgetTypeEnum | null;
  widget_params: string | null;
  widget_options: string | null;
  name?: string | null;
  description?: string | null;
}
