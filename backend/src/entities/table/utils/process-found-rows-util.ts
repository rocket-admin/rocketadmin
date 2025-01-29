import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { WidgetTypeEnum } from '../../../enums/widget-type.enum.js';
import { isBinary, binaryToHex } from '../../../helpers/binary-to-hex.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { getPropertyValueByDescriptor } from '../../../helpers/get-property-value-by-descriptor.js';
import { getValuesBetweenCurlies, replaceTextInCurlies } from '../../../helpers/operate-values-between-curlies.js';
import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import sjson from 'secure-json-parse';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';

export function processRowsUtil(
  rows: FoundRowsDS,
  tableWidgets: Array<TableWidgetEntity>,
  structure: Array<TableStructureDS>,
  customTableFields: Array<CustomFieldsEntity>,
): FoundRowsDS {
  const passwordWidgets = tableWidgets?.filter((el) => el.widget_type === WidgetTypeEnum.Password);
  const binaryColumns = structure?.filter((el) => isBinary(el.data_type));

  const parsedRows: FoundRowsDS = sjson.parse(JSON.stringify(rows), null, {
    protoAction: 'remove',
    constructorAction: 'remove',
  });

  parsedRows.data = parsedRows.data.map((row: Record<string, unknown>) => {
    if (customTableFields && customTableFields.length > 0) {
      const customFields = customTableFields.map((field) => {
        const fieldNamesFromTemplateString = getValuesBetweenCurlies(field.template_string);
        const fieldValuesForTemplateString = fieldNamesFromTemplateString
          .filter((fieldName) => isObjectPropertyExists(row, fieldName) && getPropertyValueByDescriptor(row, fieldName))
          .map((fieldName) => getPropertyValueByDescriptor(row, fieldName));

        const generatedUrlString = replaceTextInCurlies(
          field.template_string,
          fieldNamesFromTemplateString,
          fieldValuesForTemplateString,
        );

        return {
          type: field.type,
          url_template: generatedUrlString,
          text: field.text,
        };
      });
      row['#autoadmin:customFields'] = customFields;
    }

    binaryColumns?.forEach((column) => {
      if (row[column.column_name]) {
        row[column.column_name] = binaryToHex(row[column.column_name] as string);
      }
    });

    passwordWidgets?.forEach((widget) => {
      if (row[widget.field_name]) {
        row[widget.field_name] = Constants.REMOVED_PASSWORD_VALUE;
      }
    });

    return row;
  });

  return parsedRows;
}
