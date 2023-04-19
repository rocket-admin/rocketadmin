import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/found-rows.ds.js';

export function removePasswordsFromRowsUtil(rows: FoundRowsDS, tableWidgets: Array<TableWidgetEntity>): FoundRowsDS {
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
