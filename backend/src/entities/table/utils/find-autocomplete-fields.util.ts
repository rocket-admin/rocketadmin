import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { AutocompleteFieldsDs } from '../application/data-structures/found-table-rows.ds.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function findAutocompleteFieldsUtil(
  query: string,
  tableStructure: Array<TableStructureDS>,
  tableSettings: TableSettingsEntity,
  referencedColumn: string,
): AutocompleteFieldsDs {
  const rowNames = tableStructure.map((el) => {
    return el.column_name;
  });

  const { excluded_fields: excludedFields } = tableSettings;
  if (excludedFields?.indexOf(referencedColumn) >= 0 || rowNames.indexOf(referencedColumn) < 0) {
    throw new HttpException(
      {
        message: Messages.EXCLUDED_OR_NOT_EXISTS(referencedColumn),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  let autocompleteFields = [];
  autocompleteFields.push(referencedColumn);
  if (tableSettings && tableSettings.autocomplete_columns) {
    for (const column of tableSettings.autocomplete_columns) {
      const index = rowNames.indexOf(column);
      if (index >= 0) {
        autocompleteFields.push(rowNames.at(index));
      }
    }
  } else if (tableSettings && tableSettings.excluded_fields) {
    for (const column of tableSettings.excluded_fields) {
      const indexInAll = rowNames.indexOf(column);
      const indexInExcluded = tableSettings.excluded_fields.indexOf(column);
      if (indexInAll >= 0 && indexInExcluded < 0) {
        autocompleteFields.push(column);
      }
    }
  } else {
    autocompleteFields = rowNames;
  }
  if (tableSettings) {
    const identityColumnIndex = autocompleteFields.findIndex((columnName) => {
      return columnName === tableSettings?.identity_column;
    });
    if (identityColumnIndex < 0) {
      if (tableSettings.identity_column && tableSettings.identity_column.length > 0) {
        autocompleteFields.unshift(tableSettings.identity_column);
      }
    }
  }
  return {
    fields: autocompleteFields,
    value: query['autocomplete'] === '' ? '*' : query['autocomplete'],
  };
}
