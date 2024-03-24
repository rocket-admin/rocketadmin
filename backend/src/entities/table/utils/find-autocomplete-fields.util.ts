import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { AutocompleteFieldsDs } from '../application/data-structures/found-table-rows.ds.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Messages } from '../../../exceptions/text/messages.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function findAutocompleteFieldsUtil(
  query: Record<string, unknown>,
  tableStructure: Array<TableStructureDS>,
  tableSettings: TableSettingsEntity,
  referencedColumn: string,
): AutocompleteFieldsDs {
  const rowNames = new Set(tableStructure.map((el) => el.column_name));

  if (tableSettings?.excluded_fields?.includes(referencedColumn) || !rowNames.has(referencedColumn)) {
    throw new HttpException(
      {
        message: Messages.EXCLUDED_OR_NOT_EXISTS(referencedColumn),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  let autocompleteFields = [referencedColumn];

  if (tableSettings?.autocomplete_columns) {
    autocompleteFields.push(...tableSettings.autocomplete_columns.filter((column) => rowNames.has(column)));
  } else if (tableSettings?.excluded_fields) {
    autocompleteFields.push(
      ...tableSettings.excluded_fields.filter(
        (column) => rowNames.has(column) && !tableSettings.excluded_fields.includes(column),
      ),
    );
  } else {
    autocompleteFields = [...rowNames];
  }

  if (tableSettings?.identity_column && !autocompleteFields.includes(tableSettings.identity_column)) {
    autocompleteFields.unshift(tableSettings.identity_column);
  }

  return {
    fields: autocompleteFields,
    value: query['autocomplete'] === '' ? '*' : (query['autocomplete'] as string),
  };
}
