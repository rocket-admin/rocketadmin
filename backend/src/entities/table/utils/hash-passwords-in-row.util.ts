import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { IPasswordWidgetParams } from '../../widget/table-widget.interface.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import JSON5 from 'json5';

export async function hashPasswordsInRowUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Promise<Record<string, unknown>> {
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
    try {
      const widgetParams = JSON5.parse(widget.widget_params) as unknown as IPasswordWidgetParams;
      if (row[widget.field_name] !== undefined && row[widget.field_name] !== null && widgetParams.encrypt) {
        if (row[widget.field_name] === '') {
          delete row[widget.field_name];
          continue;
        }
        row[widget.field_name] = await Encryptor.processDataWithAlgorithm(
          row[widget.field_name] as any,
          widgetParams.algorithm,
        );
      }
    } catch (e) {
      console.log('-> Error in password widget encryption processing', e);
    }
  }
  return row;
}
