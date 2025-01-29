import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { stringify as uuidStringify } from 'uuid';
import JSON5 from 'json5';

export function processUuidsInRowUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Record<string, unknown> {
  const uuidWidgets = tableWidgets?.filter((widget) => widget.widget_type === WidgetTypeEnum.UUID) || [];

  for (const widget of uuidWidgets) {
    try {
      const widgetParams = JSON5.parse(widget.widget_params);
      if (row[widget.field_name] && Buffer.isBuffer(widgetParams)) {
        row[widget.field_name] = uuidStringify(widgetParams);
      }
    } catch (e) {
      console.error('-> Error in UUID widget processing', e);
    }
  }

  return row;
}
