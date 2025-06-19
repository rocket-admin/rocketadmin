import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { WidgetTypeEnum } from '../../../enums/index.js';
import { IPasswordWidgetParams } from '../../widget/table-widget.interface.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { Constants } from '../../../helpers/constants/constants.js';
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

      // Skip processing if the field value is the removed password placeholder
      if (fieldValue === Constants.REMOVED_PASSWORD_VALUE) {
        delete row[widget.field_name];
        continue;
      }

      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && widgetParams.encrypt) {
        row[widget.field_name] = await Encryptor.processDataWithAlgorithm(fieldValue as any, widgetParams.algorithm);
      }
    } catch (e) {
      console.log('-> Error in password widget encryption processing', e);
    }
  }

  return row;
}
