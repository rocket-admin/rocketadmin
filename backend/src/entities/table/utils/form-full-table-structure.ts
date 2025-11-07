import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { FullTableStructureDs } from '../application/data-structures/found-table-structure.ds.js';
import { checkFieldAutoincrement } from '../../../helpers/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function formFullTableStructure(
  structure: Array<TableStructureDS>,
  tableSettings: TableSettingsEntity,
): Array<FullTableStructureDs> {
  const { search_fields, excluded_fields } = tableSettings || {};

  return structure.map(
    ({ column_name, column_default, data_type, data_type_params, allow_null, character_maximum_length, extra }) => ({
      column_name,
      column_default,
      data_type,
      data_type_params: data_type_params || undefined,
      isExcluded: excluded_fields?.includes(column_name) || false,
      isSearched: search_fields?.includes(column_name) || false,
      auto_increment: checkFieldAutoincrement(column_default, extra),
      allow_null,
      character_maximum_length,
    }),
  );
}
