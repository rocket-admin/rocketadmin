import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { stringify as uuidStringify } from 'uuid';
import JSON5 from 'json5';

export function processUuidsInRowUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Record<string, unknown> {
  const uuidWidgets = tableWidgets.filter((el) => {
    return el.widget_type === WidgetTypeEnum.UUID;
  });
  if (uuidWidgets.length <= 0) {
    return row;
  }

  for (const widget of uuidWidgets) {
    try {
      if (row[widget.field_name] && Buffer.isBuffer(JSON5.parse(widget.widget_params))) {
        row[widget.field_name] = uuidStringify(JSON5.parse(widget.widget_params));
      }
    } catch (e) {
      console.log('-> Error in password widget encryption processing', e);
    }
  }
  return row;
}
