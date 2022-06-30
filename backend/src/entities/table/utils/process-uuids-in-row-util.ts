import { TableWidgetEntity } from '../../widget/table-widget.entity';
import { WidgetTypeEnum } from '../../../enums';
import { stringify as uuidStringify } from 'uuid';

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
      if (row[widget.field_name] && Buffer.isBuffer(widget.widget_params)) {
        row[widget.field_name] = uuidStringify(widget.widget_params);
      }
    } catch (e) {
      console.log('-> Error in password widget encryption processing', e);
    }
  }
  return row;
}
