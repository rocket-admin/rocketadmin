import { TableWidgetEntity } from '../../widget/table-widget.entity';
import { IRows } from '../../../data-access-layer/shared/data-access-object-interface';
import { WidgetTypeEnum } from '../../../enums';
import { Constants } from '../../../helpers/constants/constants';

export function removePasswordsFromRowsUtil(rows: IRows, tableWidgets: Array<TableWidgetEntity>): IRows {
  if (!tableWidgets || tableWidgets.length <= 0) {
    return rows;
  }
  const passwordWidgets = tableWidgets.filter((el) => {
    return el.widget_type === WidgetTypeEnum.Password;
  });
  if (passwordWidgets.length <= 0) {
    return rows;
  }
  const { data } = rows;
  rows.data = data.map((row) => {
    for (const widget of passwordWidgets) {
      if (row[widget.field_name]) {
        row[widget.field_name] = Constants.REMOVED_PASSWORD_VALUE;
      }
    }
    return row;
  });
  return rows;
}
