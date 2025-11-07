import { TableSettingsDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';

export function findAvailableFields(settings: TableSettingsDS, tableStructure: Array<TableStructureDS>): Array<string> {
  let availableFields: Array<string> = [];
  const fieldsFromStructure = tableStructure.map((el) => {
    return el.column_name;
  });

  if (isObjectEmpty(settings)) {
    availableFields = tableStructure.map((el) => {
      return el.column_name;
    });
    return availableFields;
  }
  const excludedFields = settings.excluded_fields;

  if (settings.list_fields && settings.list_fields.length > 0) {
    const validListFields = settings.list_fields.filter((fieldName) => {
      return fieldsFromStructure.includes(fieldName);
    });

    const additionalFields = fieldsFromStructure.filter((fieldName) => {
      return !settings.list_fields.includes(fieldName);
    });

    availableFields = [...validListFields, ...additionalFields];
  } else {
    availableFields = tableStructure.map((el) => {
      return el.column_name;
    });
  }
  if (excludedFields && excludedFields.length > 0) {
    for (const field of excludedFields) {
      const delIndex = availableFields.indexOf(field);
      if (delIndex >= 0) {
        availableFields.splice(availableFields.indexOf(field), 1);
      }
    }
  }
  return availableFields;
}
