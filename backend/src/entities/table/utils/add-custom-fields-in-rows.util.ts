import { CustomFieldsEntity } from '../../custom-field/custom-fields.entity.js';
import sjson from 'secure-json-parse';
import { getPropertyValueByDescriptor, getValuesBetweenCurlies, replaceTextInCurlies } from '../../../helpers/index.js';
import { FoundRowsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/found-rows.ds.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';

export function addCustomFieldsInRowsUtil(
  rows: FoundRowsDS,
  customTableFields: Array<CustomFieldsEntity>,
): FoundRowsDS {
  if (!customTableFields || customTableFields.length <= 0) {
    return rows;
  }
  const parsedRows = sjson.parse(JSON.stringify(rows), null, {
    protoAction: 'remove',
    constructorAction: 'remove',
  });
  parsedRows.data = parsedRows.data.map((row: any) => {
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

    return row;
  });
  return parsedRows;
}
