import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { IPasswordWidgetParams } from '../../widget/table-widget.interface.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import JSON5 from 'json5';

export async function hashPasswordsInRowUtil(
  row: Record<string, unknown>,
  tableWidgets: Array<TableWidgetEntity>,
): Promise<Record<string, unknown>> {
  const passwordWidgets = tableWidgets?.filter((widget) => widget.widget_type === WidgetTypeEnum.Password) || [];

  for (const widget of passwordWidgets) {
    try {
      const widgetParams = JSON5.parse(widget.widget_params) as unknown as IPasswordWidgetParams;
      const fieldValue = row[widget.field_name];

      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && widgetParams.encrypt) {
        row[widget.field_name] = await Encryptor.processDataWithAlgorithm(fieldValue as any, widgetParams.algorithm);
      }
    } catch (e) {
      console.log('-> Error in password widget encryption processing', e);
    }
  }

  return row;
}
