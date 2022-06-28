import { TableWidgetEntity } from '../../widget/table-widget.entity';
import { WidgetTypeEnum } from '../../../enums';
import { Constants } from '../../../helpers/constants/constants';

export function removePasswordsFromRowsUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Record<string, unknown> {
  if (!tableWidgets || tableWidgets.length <= 0) {
    return row;
  }
  const passwordWidgets = tableWidgets.filter((el) => {
    return el.widget_type === WidgetTypeEnum.Password;
  });
  if (passwordWidgets.length <= 0) {
    return row;
  }
  for (const widget of passwordWidgets) {
    if (row[widget.field_name]) {
      row[widget.field_name] = Constants.REMOVED_PASSWORD_VALUE;
    }
  }
  return row;
}
