import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import * as sjson from 'secure-json-parse';
import { getPropertyValueByDescriptor, getValuesBetweenCurlies, replaceTextInCurlies } from '../../../helpers/index.js';
import { IRows } from '../../../data-access-layer/shared/data-access-object-interface.js';

export function addCustomFieldsInRowsUtil(rows: IRows, customTableFields: Array<CustomFieldsEntity>): IRows {
  if (!customTableFields || customTableFields.length <= 0) {
    return rows;
  }
  rows = sjson.parse(JSON.stringify(rows), null, {
    protoAction: 'remove',
    constructorAction: 'remove',
  });
  let { data } = rows;
  data = data.map((row: any) => {
    row['#autoadmin:customFields'] = [];
    for (const field of customTableFields) {
      const fieldNamesFromTemplateString = getValuesBetweenCurlies(field.template_string);
      const fieldValuesForTemplateString = [];
      for (const fieldName of fieldNamesFromTemplateString) {
        if (row.hasOwnProperty(fieldName) && getPropertyValueByDescriptor(row, fieldName)) {
          fieldValuesForTemplateString.push(getPropertyValueByDescriptor(row, fieldName));
        }
      }
      const generatedUrlString = replaceTextInCurlies(
        field.template_string,
        fieldNamesFromTemplateString,
        fieldValuesForTemplateString,
      );
      row['#autoadmin:customFields'].push({
        type: field.type,
        url_template: generatedUrlString,
        text: field.text,
      });
    }
    return row;
  });
  rows.data = data;
  return rows;
}
