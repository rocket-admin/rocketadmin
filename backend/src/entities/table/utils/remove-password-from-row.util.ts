import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';

export function removePasswordsFromRowsUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Record<string, unknown> {
  const passwordWidgets = tableWidgets?.filter((widget) => widget.widget_type === WidgetTypeEnum.Password) || [];

  for (const widget of passwordWidgets) {
    if (row[widget.field_name]) {
      row[widget.field_name] = Constants.REMOVED_PASSWORD_VALUE;
    }
  }

  return row;
}
